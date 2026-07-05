import { ALL_TASKS_LIST_ID } from '../../types/tasks.types';

// Reusable text/URL helpers shared across the messaging module.

// Frontend deep-link to a task: /:orgSlug/:projectId/:listId/:taskId. A task with no
// list lives in the virtual "All tasks" list (ALL_TASKS_LIST_ID sentinel, shared with web).
export function buildTaskDeepLink(orgSlug: string | null, goalId: number, taskId: number, goalListId: number | null): string | undefined {
    const appUrl = process.env.APP_URL;
    if (!appUrl || !orgSlug) return undefined;
    const listSegment = goalListId ?? ALL_TASKS_LIST_ID;
    return `${appUrl}/${orgSlug}/${goalId}/${listSegment}/${taskId}`;
}

// Only http(s) links are ever rendered — blocks tg://, javascript:, etc.
export function isSafeUrl(url: string): boolean {
    try {
        const scheme = new URL(url).protocol;
        return scheme === 'http:' || scheme === 'https:';
    } catch {
        return false;
    }
}

// Escapes HTML text and attribute contexts (the quotes matter inside href="...")
// so a user-controlled value can't break out of a Telegram HTML message.
export function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Slack mrkdwn requires escaping these three in text (incl. link labels).
export function escapeSlackText(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
