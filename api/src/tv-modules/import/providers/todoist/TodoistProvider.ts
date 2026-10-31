import { type } from 'arktype';
import type { ImportProvider } from '../../core/ImportProvider';
import { ImportMarkdown } from '../../core/ImportMarkdown';
import { ImportProviderError } from '../../core/ImportProviderError';
import type {
    ImportAttachment,
    ImportAttachmentDownload,
    ImportCredentials,
    ImportOptionField,
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
import { TodoistClient } from './TodoistClient';
import { TodoistMapper } from './TodoistMapper';
import { TODOIST_FILES_HOST, TODOIST_PROVIDER_ID, TODOIST_WEB_HOST } from './todoist.constants';
import type { TodoistComment, TodoistCredentials, TodoistOptions, TodoistProject, TodoistProjectSnapshot } from './todoist.types';

const TASK_BATCH_SIZE = 200;
const TOKEN_PATTERN = /^[A-Za-z0-9]{20,256}$/;

const TodoistOptionsArk = type({
    sectionsAs: "'status' | 'list'",
    includeCompleted: 'boolean',
    commentsToNote: 'boolean',
    includeAttachments: 'boolean',
});

const TodoistDownloadRefArk = type({ url: 'string' });

export class TodoistProvider implements ImportProvider {
    readonly id = TODOIST_PROVIDER_ID;

    readonly options: ImportOptionField[] = [
        { key: 'sectionsAs', kind: 'select', values: ['status', 'list'], default: 'status' },
        { key: 'includeCompleted', kind: 'toggle', default: true },
        { key: 'commentsToNote', kind: 'toggle', default: true },
        { key: 'includeAttachments', kind: 'toggle', default: true },
    ];

    auth(): ImportProviderAuth {
        return {
            popupAuthorizeUrl: null,
            popupCredentialKey: null,
            manualFields: [{ key: 'token', secret: true }],
        };
    }

    defaultOptions(): ImportProviderOptions {
        return Object.fromEntries(this.options.map((option) => [option.key, option.default]));
    }

    sanitizeOptions(options: unknown): ImportProviderSanitizeResult {
        const parsed = TodoistOptionsArk(options);
        if (parsed instanceof type.errors) return { ok: false, message: parsed.summary };
        const sanitized: TodoistOptions = {
            sectionsAs: parsed.sectionsAs,
            includeCompleted: parsed.includeCompleted,
            commentsToNote: parsed.commentsToNote,
            includeAttachments: parsed.includeAttachments,
        };
        return { ok: true, options: sanitized };
    }

    async validateCredentials(args: ImportProviderCredentialsArgs): Promise<ImportValidationResult> {
        const credentials = this.credentials(args.credentials);
        if (!credentials) return { ok: false, code: 'invalid_credentials' };
        try {
            const user = await new TodoistClient(credentials).fetchUser();
            return { ok: true, accountName: user.full_name || user.email || user.id };
        } catch (err) {
            if (err instanceof ImportProviderError) return { ok: false, code: err.code };
            throw err;
        }
    }

    async listRemoteProjects(args: ImportProviderCredentialsArgs): Promise<ImportRemoteProject[]> {
        const projects = await this.client(args.credentials).fetchProjects();
        return projects
            .filter((project) => !project.is_deleted && !project.is_archived)
            .map((project) => ({ externalId: project.id, name: project.name, url: this.projectUrl(project) }));
    }

    async fetchProjectMeta(args: ImportProviderProjectArgs): Promise<ImportProjectMeta> {
        const client = this.client(args.credentials);
        const project = await client.fetchProject(args.externalProjectId);
        const tasks = await client.fetchActiveTasks(args.externalProjectId);
        const people = project.is_shared ? await client.fetchCollaborators(args.externalProjectId) : [];

        return {
            externalId: project.id,
            name: project.name,
            url: this.projectUrl(project),
            people: people.map((person) => ({
                externalId: person.id,
                displayName: person.name || person.email || person.id,
                username: null,
                email: person.email ?? null,
            })),
            taskCount: tasks.length,
            archivedTaskCount: null,
            attachmentCount: null,
            attachmentBytes: null,
        };
    }

    createReader(args: ImportProviderReaderArgs): ImportReader {
        const client = this.client(args.credentials);
        const sanitized = this.sanitizeOptions(args.options);
        if (!sanitized.ok) throw new Error(`Invalid Todoist import options: ${sanitized.message}`);
        const options = sanitized.options as TodoistOptions;
        let mapper: TodoistMapper | null = null;

        const loadMapper = async (): Promise<TodoistMapper> => {
            if (mapper) return mapper;
            const projectId = args.externalProjectId;
            const project = await client.fetchProject(projectId);
            const tasks = await client.fetchTasks({ projectId, includeCompleted: options.includeCompleted });
            const commentsByTask = new Map<string, TodoistComment[]>();
            if (options.commentsToNote || options.includeAttachments) {
                for (const task of tasks) {
                    const comments = await client.fetchComments(task.id);
                    if (comments.length > 0) commentsByTask.set(task.id, comments);
                }
            }
            const snapshot: TodoistProjectSnapshot = {
                project,
                sections: await client.fetchSections(projectId),
                tasks,
                labels: await client.fetchLabels(),
                people: project.is_shared ? await client.fetchCollaborators(projectId) : [],
                commentsByTask,
            };
            mapper = new TodoistMapper({ snapshot, options, locale: args.locale });
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

    private parseDownloadRef(ref: string): string {
        const parsed = TodoistDownloadRefArk(JSON.parse(ref));
        if (parsed instanceof type.errors || !ImportMarkdown.httpsUrlOnHost(parsed.url, TODOIST_FILES_HOST)) {
            throw new ImportProviderError('not_found', 'Invalid Todoist attachment reference');
        }
        return parsed.url;
    }

    private projectUrl(project: TodoistProject): string {
        return `https://${TODOIST_WEB_HOST}/app/project/${encodeURIComponent(project.id)}`;
    }

    private client(credentials: ImportCredentials): TodoistClient {
        const parsed = this.credentials(credentials);
        if (!parsed) throw new ImportProviderError('invalid_credentials', 'Todoist token is malformed');
        return new TodoistClient(parsed);
    }

    private credentials(credentials: ImportCredentials): TodoistCredentials | null {
        const token = credentials.token?.trim();
        if (!token || !TOKEN_PATTERN.test(token)) return null;
        return { token };
    }
}
