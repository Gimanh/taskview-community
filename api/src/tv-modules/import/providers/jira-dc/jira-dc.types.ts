import type { ImportLocale } from '../../core/import-provider.types';
import type { JiraDcClient } from './JiraDcClient';

export type JiraDcCredentials = {
    siteUrl: string;
    token: string;
};

export type JiraDcOptions = {
    epicsAs: 'list' | 'task';
    includeDone: boolean;
    commentsToNote: boolean;
    includeAttachments: boolean;
};

export type JiraDcUser = {
    key?: string | null;
    name?: string | null;
    displayName?: string | null;
    emailAddress?: string | null;
};

export type JiraDcProject = {
    id: string;
    key: string;
    name: string;
    description?: string | null;
};

export type JiraDcStatusCategory = {
    key: string;
};

export type JiraDcStatus = {
    id: string;
    name: string;
    statusCategory?: JiraDcStatusCategory | null;
};

export type JiraDcIssueTypeStatuses = {
    statuses: JiraDcStatus[];
};

export type JiraDcIssueType = {
    name?: string | null;
    subtask?: boolean;
};

export type JiraDcAttachment = {
    id: string;
    filename: string;
    mimeType?: string | null;
    size?: number | null;
};

export type JiraDcComment = {
    id: string;
    author?: JiraDcUser | null;
    body?: string | null;
    created: string;
};

export type JiraDcCommentPage = {
    comments: JiraDcComment[];
    total?: number;
    startAt?: number;
};

export type JiraDcPriority = {
    name?: string | null;
};

export type JiraDcField = {
    id: string;
    name?: string | null;
    schema?: { custom?: string | null } | null;
};

export type JiraDcEpicFields = {
    epicLink: string | null;
    epicName: string | null;
};

export type JiraDcIssueFields = {
    summary?: string | null;
    description?: string | null;
    status?: JiraDcStatus | null;
    issuetype?: JiraDcIssueType | null;
    parent?: { id: string } | null;
    labels?: string[] | null;
    priority?: JiraDcPriority | null;
    assignee?: JiraDcUser | null;
    duedate?: string | null;
    resolutiondate?: string | null;
    attachment?: JiraDcAttachment[] | null;
    comment?: JiraDcCommentPage | null;
    [customField: string]: unknown;
};

export type JiraDcIssue = {
    id: string;
    key: string;
    fields: JiraDcIssueFields;
};

export type JiraDcSearchPage = {
    issues: JiraDcIssue[];
    startAt?: number;
    total?: number;
};

export type JiraDcSearchArgs = {
    jql: string;
    fields: string[];
};

export type JiraDcDownloadRef = {
    id: string;
    filename: string;
};

export type JiraDcProjectSnapshot = {
    project: JiraDcProject;
    statuses: JiraDcStatus[];
    issues: JiraDcIssue[];
    epicFields: JiraDcEpicFields;
    commentsByIssue: Map<string, JiraDcComment[]>;
};

export type JiraDcMapperArgs = {
    snapshot: JiraDcProjectSnapshot;
    siteUrl: string;
    options: JiraDcOptions;
    locale: ImportLocale;
};

export type JiraDcPlacement = {
    parentId: string | null;
    listId: string | null;
};

export type JiraDcToTaskArgs = {
    issue: JiraDcIssue;
    parentId: string | null;
    listId: string | null;
};

export type JiraDcCommentsArgs = {
    client: JiraDcClient;
    issues: JiraDcIssue[];
};

export type JiraDcJqlArgs = {
    projectId: string;
    includeDone: boolean;
};

export type JiraDcCodeBlockArgs = {
    params: string | undefined;
    code: string;
};
