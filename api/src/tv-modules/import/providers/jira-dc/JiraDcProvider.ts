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
import { JiraDcClient } from './JiraDcClient';
import { JiraDcMapper } from './JiraDcMapper';
import {
    JIRA_DC_EPIC_LINK_FIELD,
    JIRA_DC_EPIC_NAME_FIELD,
    JIRA_DC_META_FIELDS,
    JIRA_DC_PAGE_PATH,
    JIRA_DC_PROVIDER_ID,
    JIRA_DC_TASK_FIELDS,
} from './jira-dc.constants';
import type {
    JiraDcComment,
    JiraDcCommentsArgs,
    JiraDcCredentials,
    JiraDcDownloadRef,
    JiraDcEpicFields,
    JiraDcJqlArgs,
    JiraDcOptions,
    JiraDcProjectSnapshot,
} from './jira-dc.types';

const TASK_BATCH_SIZE = 200;
const TOKEN_PATTERN = /^[A-Za-z0-9+/=_-]{20,512}$/;
const SITE_URL_MAX_LENGTH = 500;

const JiraDcOptionsArk = type({
    epicsAs: "'list' | 'task'",
    includeDone: 'boolean',
    commentsToNote: 'boolean',
    includeAttachments: 'boolean',
});

const JiraDcDownloadRefArk = type({ id: /^\d+$/, filename: '0 < string <= 255' });

export class JiraDcProvider implements ImportProvider {
    readonly id = JIRA_DC_PROVIDER_ID;

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
                { key: 'token', secret: true },
            ],
        };
    }

    defaultOptions(): ImportProviderOptions {
        return Object.fromEntries(this.options.map((option) => [option.key, option.default]));
    }

    sanitizeOptions(options: unknown): ImportProviderSanitizeResult {
        const parsed = JiraDcOptionsArk(options);
        if (parsed instanceof type.errors) return { ok: false, message: parsed.summary };
        const sanitized: JiraDcOptions = {
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
            const user = await new JiraDcClient(credentials).fetchMyself();
            const name = user.displayName || user.name || user.emailAddress || 'Jira';
            return { ok: true, accountName: `${name} · ${new URL(credentials.siteUrl).host}` };
        } catch (err) {
            if (err instanceof ImportProviderError) return { ok: false, code: err.code };
            throw err;
        }
    }

    async listRemoteProjects(args: ImportProviderCredentialsArgs): Promise<ImportRemoteProject[]> {
        const credentials = this.credentials(args.credentials);
        const projects = await new JiraDcClient(credentials).fetchProjects();
        return projects
            .map((project) => ({
                externalId: project.id,
                name: `${project.name} (${project.key})`,
                url: `${credentials.siteUrl}/browse/${encodeURIComponent(project.key)}`,
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }

    async fetchProjectMeta(args: ImportProviderProjectArgs): Promise<ImportProjectMeta> {
        const credentials = this.credentials(args.credentials);
        const client = new JiraDcClient(credentials);
        const project = await client.fetchProject(this.projectId(args.externalProjectId));
        const issues = await client.searchIssues({ jql: this.jql({ projectId: project.id, includeDone: true }), fields: JIRA_DC_META_FIELDS });

        const people = new Map<string, ImportPerson>();
        let attachmentCount = 0;
        let attachmentBytes = 0;
        for (const issue of issues) {
            const assignee = issue.fields.assignee;
            const id = assignee?.key || assignee?.name;
            if (assignee && id && !people.has(id)) {
                people.set(id, {
                    externalId: id,
                    displayName: assignee.displayName || assignee.name || id,
                    username: assignee.name ?? null,
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
        const client = new JiraDcClient(credentials);
        const sanitized = this.sanitizeOptions(args.options);
        if (!sanitized.ok) throw new Error(`Invalid Jira Data Center import options: ${sanitized.message}`);
        const options = sanitized.options as JiraDcOptions;
        let mapper: JiraDcMapper | null = null;

        const loadMapper = async (): Promise<JiraDcMapper> => {
            if (mapper) return mapper;
            const project = await client.fetchProject(this.projectId(args.externalProjectId));
            const epicFields = await this.epicFields(client);
            const extraFields = [epicFields.epicLink, epicFields.epicName].filter((field): field is string => field !== null);
            const issues = await client.searchIssues({
                jql: this.jql({ projectId: project.id, includeDone: options.includeDone }),
                fields: [...JIRA_DC_TASK_FIELDS, ...extraFields],
            });
            const snapshot: JiraDcProjectSnapshot = {
                project,
                statuses: await client.fetchStatuses(project.id),
                issues,
                epicFields,
                commentsByIssue: options.commentsToNote ? await this.comments({ client, issues }) : new Map(),
            };
            mapper = new JiraDcMapper({ snapshot, siteUrl: credentials.siteUrl, options, locale: args.locale });
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

    // Epics are a Jira Software feature: the "Epic Link" and "Epic Name" custom fields are absent without it
    private async epicFields(client: JiraDcClient): Promise<JiraDcEpicFields> {
        const fields = await client.fetchFields();
        const find = (custom: string) => fields.find((field) => field.schema?.custom === custom)?.id ?? null;
        return { epicLink: find(JIRA_DC_EPIC_LINK_FIELD), epicName: find(JIRA_DC_EPIC_NAME_FIELD) };
    }

    // Search returns the comments with each issue; only threads it cut short cost an extra request
    private async comments(args: JiraDcCommentsArgs): Promise<Map<string, JiraDcComment[]>> {
        const result = new Map<string, JiraDcComment[]>();
        for (const issue of args.issues) {
            const page = issue.fields.comment;
            if (!page) continue;
            const comments = (page.total ?? 0) > page.comments.length ? await args.client.fetchComments(issue.id) : page.comments;
            if (comments.length > 0) result.set(issue.id, comments);
        }
        return result;
    }

    private jql(args: JiraDcJqlArgs): string {
        const filter = args.includeDone ? '' : ' AND statusCategory != Done';
        return `project = ${args.projectId}${filter} ORDER BY created ASC`;
    }

    private projectId(value: string): string {
        if (!/^\d+$/.test(value)) throw new ImportProviderError('not_found', 'Jira project id is malformed');
        return value;
    }

    private parseDownloadRef(ref: string): JiraDcDownloadRef {
        const parsed = JiraDcDownloadRefArk(JSON.parse(ref));
        if (parsed instanceof type.errors) throw new ImportProviderError('not_found', 'Invalid Jira attachment reference');
        return { id: parsed.id, filename: parsed.filename };
    }

    private credentials(credentials: ImportCredentials): JiraDcCredentials {
        const siteUrl = this.siteUrl(credentials.siteUrl);
        const token = credentials.token?.trim();
        if (!token || !TOKEN_PATTERN.test(token)) throw new ImportProviderError('invalid_credentials', 'Jira personal access token is malformed');
        return { siteUrl, token };
    }

    // Keeps the context path (https://host/jira) and drops whatever page the user copied the address from
    private siteUrl(value: string | undefined): string {
        const raw = value?.trim() ?? '';
        if (!raw || raw.length > SITE_URL_MAX_LENGTH) throw new ImportProviderError('invalid_url', 'Jira address is empty or too long');
        let parsed: URL;
        try {
            parsed = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
        } catch {
            throw new ImportProviderError('invalid_url', 'Jira address is not a valid URL');
        }
        if ((parsed.protocol !== 'https:' && parsed.protocol !== 'http:') || parsed.username || parsed.password || !parsed.hostname) {
            throw new ImportProviderError('invalid_url', 'Jira address must be an http(s) URL without credentials');
        }
        const path = parsed.pathname.replace(JIRA_DC_PAGE_PATH, '').replace(/\/+$/, '');
        return `${parsed.protocol}//${parsed.host}${path}`;
    }
}
