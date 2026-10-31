import type { ImportLocale } from '../../core/import-provider.types';

export type TodoistCredentials = {
    token: string;
};

export type TodoistSectionsAs = 'status' | 'list';

export type TodoistOptions = {
    sectionsAs: TodoistSectionsAs;
    includeCompleted: boolean;
    commentsToNote: boolean;
    includeAttachments: boolean;
};

export type TodoistPage<T> = {
    results: T[];
    next_cursor: string | null;
};

export type TodoistCompletedPage = {
    items: TodoistTask[];
    next_cursor?: string | null;
};

export type TodoistUser = {
    id: string;
    email: string | null;
    full_name: string | null;
};

export type TodoistProject = {
    id: string;
    name: string;
    description?: string | null;
    is_shared?: boolean;
    is_archived?: boolean;
    is_deleted?: boolean;
};

export type TodoistSection = {
    id: string;
    name: string;
    section_order: number;
    is_deleted?: boolean;
    is_archived?: boolean;
};

export type TodoistDue = {
    date: string;
    string?: string | null;
    is_recurring?: boolean;
};

export type TodoistTask = {
    id: string;
    content: string;
    description?: string | null;
    section_id: string | null;
    parent_id: string | null;
    child_order: number;
    labels?: string[];
    priority: number;
    responsible_uid: string | null;
    checked?: boolean;
    is_deleted?: boolean;
    completed_at?: string | null;
    due: TodoistDue | null;
};

export type TodoistLabel = {
    id: string;
    name: string;
    color: string | null;
};

export type TodoistCollaborator = {
    id: string;
    name: string | null;
    email: string | null;
};

export type TodoistFileAttachment = {
    file_name?: string | null;
    file_size?: number | null;
    file_type?: string | null;
    file_url?: string | null;
};

export type TodoistComment = {
    id: string;
    content: string | null;
    posted_uid: string | null;
    posted_at: string;
    is_deleted?: boolean;
    file_attachment?: TodoistFileAttachment | null;
};

export type TodoistProjectSnapshot = {
    project: TodoistProject;
    sections: TodoistSection[];
    tasks: TodoistTask[];
    labels: TodoistLabel[];
    people: TodoistCollaborator[];
    commentsByTask: Map<string, TodoistComment[]>;
};

export type TodoistPagedRequestArgs = {
    path: string;
    params?: Record<string, string | number>;
};

export type TodoistFetchTasksArgs = {
    projectId: string;
    includeCompleted: boolean;
};

export type TodoistDownloadRef = {
    url: string;
};

export type TodoistMapperArgs = {
    snapshot: TodoistProjectSnapshot;
    options: TodoistOptions;
    locale: ImportLocale;
};
