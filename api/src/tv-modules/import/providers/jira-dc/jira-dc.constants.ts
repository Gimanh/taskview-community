import type { ImportPriority } from '../../core/import-provider.types';

export const JIRA_DC_PROVIDER_ID = 'jira-dc';

export const JIRA_DC_DEFAULT_LABEL_COLOR = '#808080';

export const JIRA_DC_EPIC_LINK_FIELD = 'com.pyxis.greenhopper.jira:gh-epic-link';

export const JIRA_DC_EPIC_NAME_FIELD = 'com.pyxis.greenhopper.jira:gh-epic-label';

// Status categories in board order: To Do, In Progress, Done
export const JIRA_DC_CATEGORY_ORDER: Record<string, number> = {
    new: 0,
    indeterminate: 1,
    done: 2,
};

export const JIRA_DC_PRIORITIES: Record<string, ImportPriority> = {
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

export const JIRA_DC_TASK_FIELDS = [
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
    'attachment',
    'comment',
];

export const JIRA_DC_META_FIELDS = ['assignee', 'attachment'];

// Paths a pasted Jira page URL may carry after the base URL (and context path)
export const JIRA_DC_PAGE_PATH = /\/(browse|secure|projects|issues|plugins|rest)(\/.*)?$/i;
