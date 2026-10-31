import type { ImportPriority } from '../../core/import-provider.types';

export const JIRA_CLOUD_PROVIDER_ID = 'jira-cloud';

export const JIRA_CLOUD_SITE_SUFFIX = '.atlassian.net';

export const JIRA_CLOUD_DEFAULT_LABEL_COLOR = '#808080';

export const JIRA_CLOUD_EPIC_LEVEL = 1;

// Status categories in board order: To Do, In Progress, Done
export const JIRA_CLOUD_CATEGORY_ORDER: Record<string, number> = {
    new: 0,
    indeterminate: 1,
    done: 2,
};

export const JIRA_CLOUD_PRIORITIES: Record<string, ImportPriority> = {
    highest: 3,
    high: 3,
    blocker: 3,
    critical: 3,
    medium: 2,
    major: 2,
    low: 1,
    lowest: 1,
    minor: 1,
    trivial: 1,
};

export const JIRA_CLOUD_TASK_FIELDS = [
    'summary',
    'description',
    'status',
    'issuetype',
    'parent',
    'labels',
    'priority',
    'assignee',
    'duedate',
    'resolutiondate',
    'statuscategorychangedate',
    'attachment',
    'comment',
];

export const JIRA_CLOUD_META_FIELDS = ['assignee', 'attachment'];
