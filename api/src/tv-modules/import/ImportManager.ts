import type { ImportJobsSchemaTypeForSelect } from 'taskview-db-schemas';
import type { AppUser } from '../../core/AppUser';
import { getJobQueue } from '../../core/JobQueue';
import { $logger } from '../../modules/logget';
import { decrypt, encrypt } from '../../utils/crypto';
import { ImportProviderError } from './core/ImportProviderError';
import { ImportProviderRegistry } from './core/ImportProviderRegistry';
import type { ImportCredentials, ImportProjectMeta, ImportRemoteProject } from './core/import-provider.types';
import { ImportRepository } from './ImportRepository';
import {
    IMPORT_MAX_DRAFTS_PER_HOUR,
    IMPORT_RUN_JOB,
    type ImportArgCreateJob,
    type ImportArgProjectMeta,
    type ImportArgStart,
    type ImportJobConfig,
    type ImportJobForClient,
    type ImportJobErrorCode,
    type ImportJobProgress,
    type ImportJobStats,
    type ImportManagerResult,
    type ImportProviderInfo,
    type ImportRunJobData,
    type ImportWhitelistCredentialsArgs,
    type ImportWithDraftArgs,
} from './types';

export class ImportManager {
    private readonly user: AppUser;
    readonly repository = new ImportRepository();

    constructor(user: AppUser) {
        this.user = user;
    }

    private get userId(): number {
        return this.user.getUserData()!.id;
    }

    providers(): ImportProviderInfo[] {
        return ImportProviderRegistry.all().map((provider) => {
            const auth = provider.auth();
            return {
                id: provider.id,
                popupAuthorizeUrl: auth.popupAuthorizeUrl,
                popupCredentialKey: auth.popupCredentialKey,
                manualFields: auth.manualFields,
                options: provider.options,
            };
        });
    }

    async createJob(args: ImportArgCreateJob): Promise<ImportManagerResult<ImportJobForClient>> {
        const provider = ImportProviderRegistry.get(args.provider);
        if (!provider) return { ok: false, status: 400, code: 'unknown_provider' };

        const recent = await this.repository.countJobsCreatedSince({ createdBy: this.userId, since: new Date(Date.now() - 60 * 60 * 1000) });
        if (recent >= IMPORT_MAX_DRAFTS_PER_HOUR) return { ok: false, status: 429, code: 'too_many_drafts' };

        const credentials = this.whitelistCredentials({ provider, credentials: args.credentials });
        const validation = await provider.validateCredentials({ credentials });
        if (!validation.ok) return this.providerFailure(validation.code);

        const job = await this.repository.createJob({
            organizationId: args.organizationId,
            createdBy: this.userId,
            provider: provider.id,
            credentialsEncrypted: encrypt(JSON.stringify(credentials)),
            accountName: validation.accountName.slice(0, 255),
        });
        if (!job) return { ok: false, status: 500, code: 'internal' };
        return { ok: true, data: this.toClient(job) };
    }

    async fetchJobs(organizationId: number): Promise<ImportJobForClient[]> {
        const jobs = await this.repository.fetchJobs({ organizationId, createdBy: this.userId });
        return jobs.map((job) => this.toClient(job));
    }

    async fetchJob(id: number): Promise<ImportJobForClient | null> {
        const job = await this.repository.fetchJob(id);
        return job ? this.toClient(job) : null;
    }

    async listRemoteProjects(id: number): Promise<ImportManagerResult<ImportRemoteProject[]>> {
        return this.withDraft({ id, action: ({ provider, credentials }) => provider.listRemoteProjects({ credentials }) });
    }

    async fetchProjectMeta(args: ImportArgProjectMeta): Promise<ImportManagerResult<ImportProjectMeta>> {
        return this.withDraft({
            id: args.id,
            action: ({ provider, credentials }) => provider.fetchProjectMeta({ credentials, externalProjectId: args.externalId }),
        });
    }

    async start(args: ImportArgStart): Promise<ImportManagerResult<ImportJobForClient>> {
        const job = await this.repository.fetchJob(args.id);
        if (!job || job.status !== 'draft' || !job.credentialsEncrypted) return { ok: false, status: 409, code: 'not_draft' };
        const provider = ImportProviderRegistry.get(job.provider);
        if (!provider) return { ok: false, status: 400, code: 'unknown_provider' };

        if (await this.repository.hasActiveJob(this.userId)) return { ok: false, status: 409, code: 'already_running' };

        const options = provider.sanitizeOptions(args.options);
        if (!options.ok) return { ok: false, status: 400, code: 'invalid_options' };

        const memberIds = [...new Set(args.peopleMapping.map((entry) => entry.organizationMemberId))];
        const members = await this.repository.fetchOrgMembers({ organizationId: job.organizationId, memberIds });
        if (members.length !== memberIds.length) return { ok: false, status: 400, code: 'invalid_people_mapping' };

        const projects = await this.withDraft({ id: job.id, action: ({ credentials }) => provider.listRemoteProjects({ credentials }) });
        if (!projects.ok) return projects;
        const project = projects.data.find((item) => item.externalId === args.externalProjectId);
        if (!project) return { ok: false, status: 404, code: 'not_found' };

        const config: ImportJobConfig = {
            peopleMapping: args.peopleMapping.map((entry) => ({
                externalId: entry.externalId,
                organizationMemberId: entry.organizationMemberId,
            })),
            options: options.options,
            locale: args.locale,
        };
        const queued = await this.repository.queueJob({
            id: job.id,
            externalProjectId: project.externalId,
            externalProjectName: project.name.slice(0, 255),
            config,
        });
        if (!queued) {
            const code = (await this.repository.hasActiveJob(this.userId)) ? 'already_running' : 'not_draft';
            return { ok: false, status: 409, code };
        }

        try {
            await getJobQueue().send(IMPORT_RUN_JOB, { jobId: job.id } satisfies ImportRunJobData);
        } catch (err) {
            $logger.error(`[Import] failed to enqueue job=${job.id}: ${err instanceof Error ? err.message : String(err)}`);
            await this.repository.revertToDraft(job.id);
            return { ok: false, status: 500, code: 'internal' };
        }
        return { ok: true, data: this.toClient(queued) };
    }

    async cancel(id: number): Promise<ImportJobForClient | null> {
        const job = await this.repository.cancelJob(id);
        return job ? this.toClient(job) : null;
    }

    private async withDraft<T>(args: ImportWithDraftArgs<T>): Promise<ImportManagerResult<T>> {
        const { id, action } = args;
        const job = await this.repository.fetchJob(id);
        if (!job || job.status !== 'draft' || !job.credentialsEncrypted) return { ok: false, status: 409, code: 'not_draft' };
        const provider = ImportProviderRegistry.get(job.provider);
        if (!provider) return { ok: false, status: 400, code: 'unknown_provider' };

        try {
            const credentials = JSON.parse(decrypt(job.credentialsEncrypted)) as ImportCredentials;
            return { ok: true, data: await action({ provider, credentials }) };
        } catch (err) {
            if (err instanceof ImportProviderError) return this.providerFailure(err.code);
            $logger.error(`[Import] provider call failed job=${id}: ${err instanceof Error ? err.message : String(err)}`);
            return { ok: false, status: 500, code: 'internal' };
        }
    }

    private whitelistCredentials(args: ImportWhitelistCredentialsArgs): ImportCredentials {
        const auth = args.provider.auth();
        const allowed = new Set([...auth.manualFields.map((field) => field.key), auth.popupCredentialKey].filter((key) => key !== null));
        return Object.fromEntries(
            Object.entries(args.credentials).filter(([key, value]) => allowed.has(key) && value.trim() !== ''),
        );
    }

    private providerFailure<T>(code: ImportJobErrorCode): ImportManagerResult<T> {
        if (code === 'invalid_credentials' || code === 'invalid_url' || code === 'private_url') return { ok: false, status: 400, code };
        if (code === 'not_found') return { ok: false, status: 404, code };
        if (code === 'rate_limited') return { ok: false, status: 429, code };
        if (code === 'too_large') return { ok: false, status: 400, code };
        return { ok: false, status: 502, code: 'unavailable' };
    }

    private toClient(job: ImportJobsSchemaTypeForSelect): ImportJobForClient {
        return {
            id: job.id,
            organizationId: job.organizationId,
            provider: job.provider,
            status: job.status,
            accountName: job.accountName,
            externalProjectId: job.externalProjectId,
            externalProjectName: job.externalProjectName,
            goalId: job.goalId,
            progress: (job.progress as ImportJobProgress | null) ?? null,
            stats: (job.stats as ImportJobStats | null) ?? null,
            error: (job.error as ImportJobErrorCode | null) ?? null,
            createdAt: job.createdAt,
            startedAt: job.startedAt,
            finishedAt: job.finishedAt,
        };
    }
}
