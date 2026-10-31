import type { Readable } from 'stream';
import { ImportHttpClient } from '../../core/ImportHttpClient';
import { ImportProviderError } from '../../core/ImportProviderError';
import { IMPORT_MAX_TASKS } from '../../types';
import type {
    TodoistCollaborator,
    TodoistComment,
    TodoistCompletedPage,
    TodoistCredentials,
    TodoistFetchTasksArgs,
    TodoistLabel,
    TodoistPage,
    TodoistPagedRequestArgs,
    TodoistProject,
    TodoistSection,
    TodoistTask,
    TodoistUser,
} from './todoist.types';

const TODOIST_API_URL = 'https://api.todoist.com/api/v1';
const PAGE_SIZE = 200;
const MAX_PAGES = 500;
const MIN_REQUEST_INTERVAL_MS = 200;
const COMPLETED_WINDOW_DAYS = 89;
const COMPLETED_HISTORY_START = Date.UTC(2007, 0, 1);

export class TodoistClient {
    private readonly http: ImportHttpClient;

    constructor(credentials: TodoistCredentials) {
        this.http = new ImportHttpClient({
            providerName: 'Todoist',
            baseUrl: TODOIST_API_URL,
            headers: { Authorization: `Bearer ${credentials.token}` },
            minRequestIntervalMs: MIN_REQUEST_INTERVAL_MS,
        });
    }

    async fetchUser(): Promise<TodoistUser> {
        return this.http.get<TodoistUser>({ path: '/user' });
    }

    async fetchProjects(): Promise<TodoistProject[]> {
        return this.paged<TodoistProject>({ path: '/projects' });
    }

    async fetchProject(projectId: string): Promise<TodoistProject> {
        return this.http.get<TodoistProject>({ path: `/projects/${encodeURIComponent(projectId)}` });
    }

    async fetchSections(projectId: string): Promise<TodoistSection[]> {
        return this.paged<TodoistSection>({ path: '/sections', params: { project_id: projectId } });
    }

    async fetchActiveTasks(projectId: string): Promise<TodoistTask[]> {
        return this.paged<TodoistTask>({ path: '/tasks', params: { project_id: projectId } });
    }

    async fetchTasks(args: TodoistFetchTasksArgs): Promise<TodoistTask[]> {
        const tasks = new Map<string, TodoistTask>();
        for (const task of await this.fetchActiveTasks(args.projectId)) tasks.set(task.id, task);
        if (args.includeCompleted) {
            for (const task of await this.fetchCompletedTasks(args.projectId)) {
                if (!tasks.has(task.id)) tasks.set(task.id, { ...task, checked: true });
            }
        }
        return [...tasks.values()].filter((task) => !task.is_deleted);
    }

    async fetchLabels(): Promise<TodoistLabel[]> {
        return this.paged<TodoistLabel>({ path: '/labels' });
    }

    async fetchCollaborators(projectId: string): Promise<TodoistCollaborator[]> {
        return this.paged<TodoistCollaborator>({ path: `/projects/${encodeURIComponent(projectId)}/collaborators` });
    }

    async fetchComments(taskId: string): Promise<TodoistComment[]> {
        const comments = await this.paged<TodoistComment>({ path: '/comments', params: { task_id: taskId } });
        return comments.filter((comment) => !comment.is_deleted).sort((a, b) => a.posted_at.localeCompare(b.posted_at));
    }

    async download(url: string): Promise<Readable> {
        return this.http.stream(url);
    }

    // The completed-tasks endpoint only accepts ranges of up to three months,
    // so history is walked backwards in windows until Todoist's launch year.
    private async fetchCompletedTasks(projectId: string): Promise<TodoistTask[]> {
        const tasks: TodoistTask[] = [];
        const windowMs = COMPLETED_WINDOW_DAYS * 24 * 60 * 60 * 1000;
        for (let until = Date.now() + 60_000; until > COMPLETED_HISTORY_START; until -= windowMs) {
            const params = {
                project_id: projectId,
                since: new Date(Math.max(until - windowMs, COMPLETED_HISTORY_START)).toISOString(),
                until: new Date(until).toISOString(),
                limit: PAGE_SIZE,
            };
            let cursor: string | null = null;
            for (let pageIndex = 0; ; pageIndex++) {
                if (pageIndex >= MAX_PAGES) throw new ImportProviderError('too_large', 'Todoist project has too many completed tasks');
                const page: TodoistCompletedPage = await this.http.get<TodoistCompletedPage>({
                    path: '/tasks/completed/by_completion_date',
                    params: cursor ? { ...params, cursor } : params,
                });
                tasks.push(...page.items);
                if (tasks.length > IMPORT_MAX_TASKS) throw new ImportProviderError('too_large', 'Todoist project has too many tasks');
                cursor = page.next_cursor ?? null;
                if (!cursor) break;
            }
        }
        return tasks;
    }

    private async paged<T extends { id: string }>(args: TodoistPagedRequestArgs): Promise<T[]> {
        const items = new Map<string, T>();
        let cursor: string | null = null;
        for (let pageIndex = 0; ; pageIndex++) {
            if (pageIndex >= MAX_PAGES) throw new ImportProviderError('too_large', 'Todoist returned too many pages');
            const params: Record<string, string | number> = { ...args.params, limit: PAGE_SIZE };
            if (cursor) params.cursor = cursor;
            const page: TodoistPage<T> = await this.http.get<TodoistPage<T>>({ path: args.path, params });
            for (const item of page.results) items.set(item.id, item);
            cursor = page.next_cursor;
            if (!cursor) break;
        }
        return [...items.values()];
    }
}
