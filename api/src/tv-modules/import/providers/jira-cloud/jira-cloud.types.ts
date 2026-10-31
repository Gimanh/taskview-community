import type { ImportLocale } from '../../core/import-provider.types';
import type { JiraCloudClient } from './JiraCloudClient';

export type JiraCloudCredentials = {
    siteUrl: string;
    email: string;
    token: string;
};

export type JiraCloudOptions = {
    epicsAs: 'list' | 'task';
    includeDone: boolean;
    commentsToNote: boolean;
    includeAttachments: boolean;
};

export type JiraCloudAdfMark = {
    type: string;
    attrs?: Record<string, unknown>;
};

export type JiraCloudAdfNode = {
    type: string;
    text?: string;
    attrs?: Record<string, unknown>;
    marks?: JiraCloudAdfMark[];
    content?: JiraCloudAdfNode[];
};

export type JiraCloudUser = {
    accountId: string;
    displayName?: string | null;
    emailAddress?: string | null;
};

export type JiraCloudProject = {
    id: string;
    key: string;
    name: string;
    description?: string | null;
};

export type JiraCloudProjectPage = {
    values: JiraCloudProject[];
    isLast?: boolean;
};

export type JiraCloudStatusCategory = {
    key: string;
};

export type JiraCloudStatus = {
    id: string;
    name: string;
    statusCategory?: JiraCloudStatusCategory | null;
};

export type JiraCloudIssueTypeStatuses = {
    statuses: JiraCloudStatus[];
};

export type JiraCloudIssueType = {
    name?: string | null;
    subtask?: boolean;
    hierarchyLevel?: number | null;
};

export type JiraCloudAttachment = {
    id: string;
    filename: string;
    mimeType?: string | null;
    size?: number | null;
};

export type JiraCloudComment = {
    id: string;
    author?: JiraCloudUser | null;
    body?: JiraCloudAdfNode | null;
    created: string;
};

export type JiraCloudCommentPage = {
    comments: JiraCloudComment[];
    total?: number;
    startAt?: number;
};

export type JiraCloudPriority = {
    name?: string | null;
};

export type JiraCloudIssueFields = {
    summary?: string | null;
    description?: JiraCloudAdfNode | null;
    status?: JiraCloudStatus | null;
    issuetype?: JiraCloudIssueType | null;
    parent?: { id: string } | null;
    labels?: string[] | null;
    priority?: JiraCloudPriority | null;
    assignee?: JiraCloudUser | null;
    duedate?: string | null;
    resolutiondate?: string | null;
    statuscategorychangedate?: string | null;
    attachment?: JiraCloudAttachment[] | null;
    comment?: JiraCloudCommentPage | null;
};

export type JiraCloudIssue = {
    id: string;
    key: string;
    fields: JiraCloudIssueFields;
};

export type JiraCloudSearchPage = {
    issues: JiraCloudIssue[];
    nextPageToken?: string | null;
    isLast?: boolean;
};

export type JiraCloudSearchArgs = {
    jql: string;
    fields: string[];
};

export type JiraCloudProjectSnapshot = {
    project: JiraCloudProject;
    statuses: JiraCloudStatus[];
    issues: JiraCloudIssue[];
    commentsByIssue: Map<string, JiraCloudComment[]>;
};

export type JiraCloudMapperArgs = {
    snapshot: JiraCloudProjectSnapshot;
    siteUrl: string;
    options: JiraCloudOptions;
    locale: ImportLocale;
};

export type JiraCloudPlacement = {
    parentId: string | null;
    listId: string | null;
};

export type JiraCloudToTaskArgs = {
    issue: JiraCloudIssue;
    parentId: string | null;
    listId: string | null;
};

export type JiraCloudCommentsArgs = {
    client: JiraCloudClient;
    issues: JiraCloudIssue[];
};

export type JiraCloudJqlArgs = {
    projectId: string;
    includeDone: boolean;
};
