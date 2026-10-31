import type { ImportJobsSchemaTypeForSelect } from 'taskview-db-schemas';
import { AppUser } from '../../core/AppUser';
import { getCentrifugoClient } from '../../core/CentrifugoClient';
import { $logger } from '../../modules/logget';
import { decrypt } from '../../utils/crypto';
import { ORG_ADMIN_ROLES, type OrgRole } from '../organizations/types';
import { GoalsRepository } from '../goals/GoalsRepository';
import { RealtimeRepository } from '../realtime/RealtimeRepository';
import { ImportCancelledError } from './core/ImportCancelledError';
import { ImportProviderError } from './core/ImportProviderError';
import { ImportProviderRegistry } from './core/ImportProviderRegistry';
import { ImportRunError } from './core/ImportRunError';
import type { ImportCredentials } from './core/import-provider.types';
import { ImportAttachmentsUploader } from './ImportAttachmentsUploader';
import { ImportRepository } from './ImportRepository';
import { ImportRunReport } from './ImportRunReport';
import { ImportTaskWriter } from './ImportTaskWriter';
import {
    IMPORT_FINISHED_EVENT,
    IMPORT_MAX_TASKS,
    type ImportAddPeopleArgs,
    type ImportCreateGoalArgs,
    type ImportFinishArgs,
    type ImportJobConfig,
    type ImportJobErrorCode,
    type ImportOrgAdminArgs,
    type ImportPendingAttachment,
    type ImportRunContext,
    type ImportStructureIds,
    type ImportWriteStructureArgs,
    type ImportWriteTasksArgs,
} from './types';

export class ImportApplier {
    private readonly repository = new ImportRepository();

    async run(jobId: number): Promise<void> {
        const job = await this.repository.markRunning(jobId);
        if (!job) return;

        const report = new ImportRunReport({ jobId, userId: job.createdBy });
        let goalId: number | null = null;
        let tasksWritten = false;

        try {
            const context = await this.prepare(job);
            await report.progress({ phase: 'structure', done: 0, total: null, force: true });
            const structure = await context.reader.readStructure();
            if (structure.taskCount > IMPORT_MAX_TASKS) throw new ImportRunError('too_large');

            goalId = await this.createGoal({ context, structure });
            await this.repository.setGoal({ id: jobId, goalId });

            const ids = await this.writeStructure({ context, structure, goalId, report });
            const pending = await this.writeTasks({ context, structure, goalId, ids, report });
            tasksWritten = true;

            await new ImportAttachmentsUploader({
                goalId,
                actor: context.actor,
                reader: context.reader,
                report,
                ensureActive: () => this.ensureActive(context),
            }).upload(pending);

            await report.progress({ phase: 'finalizing', done: 0, total: null, force: true });
            await this.finish({ job, status: 'completed', report, error: null });
        } catch (err) {
            const cancelled = err instanceof ImportCancelledError;
            if (!cancelled) {
                $logger.error(`[Import] job=${jobId} failed: ${err instanceof Error ? err.stack ?? err.message : String(err)}`);
            }
            if (goalId !== null && !tasksWritten) {
                await new GoalsRepository().deleteGoal(goalId);
                goalId = null;
            }
            await this.finish({
                job,
                status: cancelled ? 'cancelled' : 'failed',
                report,
                error: cancelled ? null : this.errorCode(err),
            });
        }

        if (goalId !== null) await this.announceGoal(goalId);
    }

    private async prepare(job: ImportJobsSchemaTypeForSelect): Promise<ImportRunContext> {
        const provider = ImportProviderRegistry.get(job.provider);
        if (!provider || !job.credentialsEncrypted || !job.externalProjectId || !job.config) {
            throw new Error('Import job is incomplete');
        }

        const actor = await this.actorFor(job.createdBy);
        if (!actor || !(await this.isOrgAdmin({ userId: job.createdBy, organizationId: job.organizationId }))) {
            throw new ImportRunError('forbidden');
        }

        const config = job.config as ImportJobConfig;
        const credentials = JSON.parse(decrypt(job.credentialsEncrypted)) as ImportCredentials;
        const reader = provider.createReader({
            credentials,
            externalProjectId: job.externalProjectId,
            options: config.options,
            locale: config.locale,
        });
        return { job, config, actor, reader };
    }

    private async createGoal(args: ImportCreateGoalArgs): Promise<number> {
        const goal = await args.context.actor.goalsManager.createGoal({
            name: args.structure.projectName,
            description: args.structure.projectDescription,
            organizationId: args.context.job.organizationId,
        });
        if (!goal) throw new ImportRunError('goal_creation_failed');
        return goal.id;
    }

    private async writeStructure(args: ImportWriteStructureArgs): Promise<ImportStructureIds> {
        const { context, structure, goalId, report } = args;
        const goal = await context.actor.goalsManager.goalsRepository.findGoalById(goalId);
        if (!goal) throw new ImportRunError('goal_creation_failed');

        if (structure.statuses.length > 0) {
            await this.repository.deleteStatusesOfGoal(goalId);
        }
        const statusIds = await this.repository.insertStatuses(structure.statuses.map((status) => ({ goalId, name: status.name })));
        const listIds = await this.repository.insertLists(
            structure.lists.map((list) => ({ goalId, name: list.name, creatorId: context.job.createdBy })),
        );
        const tagIds = await this.repository.insertTags(
            structure.tags.map((tag) => ({ goalId, name: tag.name, color: tag.color, owner: goal.owner })),
        );
        report.stats.statusesCreated = statusIds.length;
        report.stats.listsCreated = listIds.length;
        report.stats.tagsCreated = tagIds.length;

        return {
            statusIds: new Map(structure.statuses.map((status, index) => [status.externalId, statusIds[index]])),
            listIds: new Map(structure.lists.map((list, index) => [list.externalId, listIds[index]])),
            tagIds: new Map(structure.tags.map((tag, index) => [tag.externalId, tagIds[index]])),
            assigneeIds: await this.addPeople({ context, goalId, report }),
        };
    }

    private async addPeople(args: ImportAddPeopleArgs): Promise<Map<string, number>> {
        const { context, goalId, report } = args;
        const mapping = context.config.peopleMapping;
        const members = await this.repository.fetchOrgMembers({
            organizationId: context.job.organizationId,
            memberIds: [...new Set(mapping.map((entry) => entry.organizationMemberId))],
        });
        const emailByMemberId = new Map(members.map((member) => [member.id, member.email.toLowerCase()]));

        const roles = await context.actor.collaborationRolesManager.repository.fetchRolesForGoalNew(goalId);
        const executorRole = roles.find((role) => role.name === 'executor');

        for (const email of new Set(emailByMemberId.values())) {
            const added = await context.actor.collaborationManager.addUserNew({ goalId, email });
            if (!added?.created) continue;
            report.stats.membersAdded++;
            if (executorRole) {
                await context.actor.collaborationManager.toggleUserRolesNew({ goalId, userId: added.user.id, roles: [executorRole.id] });
            }
        }

        const collabIdByEmail = await this.repository.fetchCollaboratorIds({ goalId, emails: [...new Set(emailByMemberId.values())] });
        const assigneeIds = new Map<string, number>();
        for (const entry of mapping) {
            const email = emailByMemberId.get(entry.organizationMemberId);
            const collabId = email ? collabIdByEmail.get(email) : undefined;
            if (collabId !== undefined) assigneeIds.set(entry.externalId, collabId);
        }
        return assigneeIds;
    }

    private async writeTasks(args: ImportWriteTasksArgs): Promise<ImportPendingAttachment[]> {
        const { context, structure, goalId, ids, report } = args;
        const writer = new ImportTaskWriter({ goalId, creatorId: context.job.createdBy, report, ...ids });
        const pending: ImportPendingAttachment[] = [];

        await report.progress({ phase: 'tasks', done: 0, total: structure.taskCount, force: true });
        for await (const batch of context.reader.readTasks()) {
            await this.ensureActive(context);
            pending.push(...(await writer.write(batch)));
            await report.progress({ phase: 'tasks', done: report.stats.tasksCreated, total: structure.taskCount });
        }
        return pending;
    }

    private async finish(args: ImportFinishArgs): Promise<void> {
        const finished = await this.repository.finishJob({
            id: args.job.id,
            status: args.status,
            stats: args.report.stats,
            error: args.error,
        });
        try {
            await getCentrifugoClient().publishToUser(args.job.createdBy, IMPORT_FINISHED_EVENT, {
                jobId: args.job.id,
                status: finished?.status ?? args.status,
            });
        } catch (err) {
            $logger.warn(`[Import] finish publish failed job=${args.job.id}: ${err instanceof Error ? err.message : String(err)}`);
        }
    }

    private async announceGoal(goalId: number): Promise<void> {
        try {
            const memberIds = await new RealtimeRepository().fetchGoalMemberIds(goalId);
            await Promise.all(memberIds.map((userId) => getCentrifugoClient().publishToUser(userId, 'goals.changed', { goalId })));
        } catch (err) {
            $logger.warn(`[Import] goals.changed publish failed goal=${goalId}: ${err instanceof Error ? err.message : String(err)}`);
        }
    }

    private async ensureActive(context: ImportRunContext): Promise<void> {
        if ((await this.repository.fetchStatus(context.job.id)) === 'cancelled') throw new ImportCancelledError();
        if (!(await this.isOrgAdmin({ userId: context.job.createdBy, organizationId: context.job.organizationId }))) {
            throw new ImportRunError('forbidden');
        }
    }

    // A fresh AppUser per check: OrganizationManager caches membership per instance
    private async isOrgAdmin(args: ImportOrgAdminArgs): Promise<boolean> {
        const actor = await this.actorFor(args.userId);
        const member = actor ? await actor.organizationManager.getCurrentUserMember(args.organizationId) : null;
        return !!member && ORG_ADMIN_ROLES.includes(member.role as OrgRole);
    }

    private async actorFor(userId: number): Promise<AppUser | null> {
        const user = await new AppUser().authManager.repository.fetchUserById(userId);
        if (!user || user.block !== 0) return null;
        const actor = new AppUser({ id: 0, userData: { id: user.id, login: user.login, email: user.email } });
        actor.setUserDataFromDb(user);
        return actor;
    }

    private errorCode(err: unknown): ImportJobErrorCode {
        if (err instanceof ImportProviderError) return err.code;
        if (err instanceof ImportRunError) return err.code;
        return 'internal';
    }
}
