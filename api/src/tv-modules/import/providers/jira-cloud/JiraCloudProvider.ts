import { type } from 'arktype';
import type { ImportProvider } from '../../core/ImportProvider';
import { ImportProviderError } from '../../core/ImportProviderError';
import type {
    ImportAttachment,
    ImportAttachmentDownload,
    ImportCredentials,
    ImportOptionField,
    ImportPerson,
    ImportProjectMeta,
    ImportProviderAuth,
    ImportProviderCredentialsArgs,
    ImportProviderOptions,
    ImportProviderProjectArgs,
    ImportProviderReaderArgs,
    ImportProviderSanitizeResult,
    ImportReader,
    ImportRemoteProject,
    ImportStructure,
    ImportTask,
    ImportValidationResult,
} from '../../core/import-provider.types';
import { JiraCloudClient } from './JiraCloudClient';
import { JiraCloudMapper } from './JiraCloudMapper';
import { JIRA_CLOUD_META_FIELDS, JIRA_CLOUD_PROVIDER_ID, JIRA_CLOUD_SITE_SUFFIX, JIRA_CLOUD_TASK_FIELDS } from './jira-cloud.constants';
import type {
    JiraCloudComment,
    JiraCloudCommentsArgs,
    JiraCloudCredentials,
    JiraCloudJqlArgs,
    JiraCloudOptions,
    JiraCloudProjectSnapshot,
} from './jira-cloud.types';

const TASK_BATCH_SIZE = 200;
const TOKEN_PATTERN = /^[A-Za-z0-9+/=_-]{20,512}$/;
const EMAIL_PATTERN = /^[^\s@:]+@[^\s@:]+$/;
const SITE_NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

const JiraCloudOptionsArk = type({
    epicsAs: "'list' | 'task'",
    includeDone: 'boolean',
    commentsToNote: 'boolean',
    includeAttachments: 'boolean',
});

const JiraCloudDownloadRefArk = type({ id: /^\d+$/ });

export class JiraCloudProvider implements ImportProvider {
    readonly id = JIRA_CLOUD_PROVIDER_ID;

    readonly options: ImportOptionField[] = [
        { key: 'epicsAs', kind: 'select', values: ['list', 'task'], default: 'list' },
        { key: 'includeDone', kind: 'toggle', default: true },
        { key: 'commentsToNote', kind: 'toggle', default: true },
        { key: 'includeAttachments', kind: 'toggle', default: true },
    ];

    auth(): ImportProviderAuth {
        return {
            popupAuthorizeUrl: null,
            popupCredentialKey: null,
            manualFields: [
                { key: 'siteUrl', secret: false },
                { key: 'email', secret: false },
                { key: 'token', secret: true },
            ],
        };
    }

    defaultOptions(): ImportProviderOptions {
        return Object.fromEntries(this.options.map((option) => [option.key, option.default]));
    }

    sanitizeOptions(options: unknown): ImportProviderSanitizeResult {
        const parsed = JiraCloudOptionsArk(options);
        if (parsed instanceof type.errors) return { ok: false, message: parsed.summary };
        const sanitized: JiraCloudOptions = {
            epicsAs: parsed.epicsAs,
            includeDone: parsed.includeDone,
            commentsToNote: parsed.commentsToNote,
            includeAttachments: parsed.includeAttachments,
        };
        return { ok: true, options: sanitized };
    }

    async validateCredentials(args: ImportProviderCredentialsArgs): Promise<ImportValidationResult> {
        try {
            const credentials = this.credentials(args.credentials);
            const user = await new JiraCloudClient(credentials).fetchMyself();
            const name = user.displayName || user.emailAddress || credentials.email;
            return { ok: true, accountName: `${name} · ${new URL(credentials.siteUrl).hostname}` };
        } catch (err) {
            if (err instanceof ImportProviderError) return { ok: false, code: err.code };
            throw err;
        }
    }

    async listRemoteProjects(args: ImportProviderCredentialsArgs): Promise<ImportRemoteProject[]> {
        const credentials = this.credentials(args.credentials);
        const projects = await new JiraCloudClient(credentials).fetchProjects();
        return projects.map((project) => ({
            externalId: project.id,
            name: `${project.name} (${project.key})`,
            url: `${credentials.siteUrl}/browse/${encodeURIComponent(project.key)}`,
        }));
    }

    async fetchProjectMeta(args: ImportProviderProjectArgs): Promise<ImportProjectMeta> {
        const credentials = this.credentials(args.credentials);
        const client = new JiraCloudClient(credentials);
        const project = await client.fetchProject(this.projectId(args.externalProjectId));
        const issues = await client.searchIssues({ jql: this.jql({ projectId: project.id, includeDone: true }), fields: JIRA_CLOUD_META_FIELDS });

        const people = new Map<string, ImportPerson>();
        let attachmentCount = 0;
        let attachmentBytes = 0;
        for (const issue of issues) {
            const assignee = issue.fields.assignee;
            if (assignee?.accountId && !people.has(assignee.accountId)) {
                people.set(assignee.accountId, {
                    externalId: assignee.accountId,
                    displayName: assignee.displayName || assignee.emailAddress || assignee.accountId,
                    username: null,
                    email: assignee.emailAddress ?? null,
                });
            }
            for (const attachment of issue.fields.attachment ?? []) {
                attachmentCount++;
                attachmentBytes += typeof attachment.size === 'number' ? attachment.size : 0;
            }
        }

        return {
            externalId: project.id,
            name: project.name,
            url: `${credentials.siteUrl}/browse/${encodeURIComponent(project.key)}`,
            people: [...people.values()],
            taskCount: issues.length,
            archivedTaskCount: null,
            attachmentCount,
            attachmentBytes,
        };
    }

    createReader(args: ImportProviderReaderArgs): ImportReader {
        const credentials = this.credentials(args.credentials);
        const client = new JiraCloudClient(credentials);
        const sanitized = this.sanitizeOptions(args.options);
        if (!sanitized.ok) throw new Error(`Invalid Jira Cloud import options: ${sanitized.message}`);
        const options = sanitized.options as JiraCloudOptions;
        let mapper: JiraCloudMapper | null = null;

        const loadMapper = async (): Promise<JiraCloudMapper> => {
            if (mapper) return mapper;
            const project = await client.fetchProject(this.projectId(args.externalProjectId));
            const issues = await client.searchIssues({
                jql: this.jql({ projectId: project.id, includeDone: options.includeDone }),
                fields: JIRA_CLOUD_TASK_FIELDS,
            });
            const snapshot: JiraCloudProjectSnapshot = {
                project,
                statuses: await client.fetchStatuses(project.id),
                issues,
                commentsByIssue: options.commentsToNote ? await this.comments({ client, issues }) : new Map(),
            };
            mapper = new JiraCloudMapper({ snapshot, siteUrl: credentials.siteUrl, options, locale: args.locale });
            return mapper;
        };

        return {
            readStructure: async (): Promise<ImportStructure> => (await loadMapper()).structure(),
            readTasks: async function* (): AsyncGenerator<ImportTask[]> {
                const tasks = (await loadMapper()).tasks();
                for (let i = 0; i < tasks.length; i += TASK_BATCH_SIZE) {
                    yield tasks.slice(i, i + TASK_BATCH_SIZE);
                }
            },
            downloadAttachment: async (attachment: ImportAttachment): Promise<ImportAttachmentDownload> => {
                const stream = await client.download(this.parseDownloadRef(attachment.downloadRef));
                return { stream, mimeType: attachment.mimeType };
            },
        };
    }

    // Search returns the first page of comments with each issue; only longer threads cost an extra request
    private async comments(args: JiraCloudCommentsArgs): Promise<Map<string, JiraCloudComment[]>> {
        const result = new Map<string, JiraCloudComment[]>();
        for (const issue of args.issues) {
            const page = issue.fields.comment;
            if (!page) continue;
            const comments = (page.total ?? 0) > page.comments.length ? await args.client.fetchComments(issue.id) : page.comments;
            if (comments.length > 0) result.set(issue.id, comments);
        }
        return result;
    }

    private jql(args: JiraCloudJqlArgs): string {
        const filter = args.includeDone ? '' : ' AND statusCategory != Done';
        return `project = ${args.projectId}${filter} ORDER BY created ASC`;
    }

    private projectId(value: string): string {
        if (!/^\d+$/.test(value)) throw new ImportProviderError('not_found', 'Jira project id is malformed');
        return value;
    }

    private parseDownloadRef(ref: string): string {
        const parsed = JiraCloudDownloadRefArk(JSON.parse(ref));
        if (parsed instanceof type.errors) throw new ImportProviderError('not_found', 'Invalid Jira attachment reference');
        return parsed.id;
    }

    private credentials(credentials: ImportCredentials): JiraCloudCredentials {
        const siteUrl = this.siteUrl(credentials.siteUrl);
        const email = credentials.email?.trim();
        const token = credentials.token?.trim();
        if (!email || email.length > 254 || !EMAIL_PATTERN.test(email) || !token || !TOKEN_PATTERN.test(token)) {
            throw new ImportProviderError('invalid_credentials', 'Jira email or API token is malformed');
        }
        return { siteUrl, email, token };
    }

    private siteUrl(value: string | undefined): string {
        const raw = value?.trim() ?? '';
        let parsed: URL;
        try {
            parsed = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
        } catch {
            throw new ImportProviderError('invalid_url', 'Jira site address is not a valid URL');
        }
        const host = parsed.hostname.toLowerCase();
        const siteName = host.endsWith(JIRA_CLOUD_SITE_SUFFIX) ? host.slice(0, -JIRA_CLOUD_SITE_SUFFIX.length) : '';
        if (parsed.protocol !== 'https:' || parsed.port || parsed.username || parsed.password || !SITE_NAME_PATTERN.test(siteName)) {
            throw new ImportProviderError('invalid_url', 'Jira Cloud site must be https://<name>.atlassian.net');
        }
        return `https://${host}`;
    }
}
