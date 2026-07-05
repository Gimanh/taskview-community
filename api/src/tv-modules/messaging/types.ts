import { type } from 'arktype';

export const MESSAGING_PROVIDERS = ['telegram', 'slack'] as const;
export type MessagingProviderId = typeof MESSAGING_PROVIDERS[number];

export const MESSAGING_OWNER_TYPES = ['user', 'project', 'organization'] as const;
export type MessagingOwnerType = typeof MESSAGING_OWNER_TYPES[number];

/**
 * Provider-agnostic event kinds the module reacts to. They map onto EventBus
 * events in MessagingDispatcher and onto notification types for preferences.
 */
/**
 * User-selectable events. Task events target the task's assignees; sprint events
 * target project members. Each connection subscribes to the subset it wants.
 */
export const MESSAGING_EVENTS = [
    // tasks — audience: the task's assignees (task.deleted → project members)
    'task.created',
    'task.assigned',
    'task.statusChanged',
    'task.completed',
    'task.edited',
    'task.addedToSprint',
    'task.deleted',
    // sprints — audience: project members
    'sprint.created',
    'sprint.updated',
    'sprint.started',
    'sprint.reviewStarted',
    'sprint.completed',
    'sprint.paused',
    'sprint.resumed',
    'sprint.deleted',
    // members — audience: project members
    'member.added',
    'member.removed',
    'member.rolesChanged',
    // time tracking — audience: project members
    'time.started',
    'time.stopped',
    'time.logged',
    'time.updated',
    'time.deleted',
    // recurring rules — audience: project members
    'recurrence.created',
    'recurrence.updated',
    'recurrence.paused',
    'recurrence.resumed',
    'recurrence.ended',
    'recurrence.deleted',
    'recurrence.skipped',
] as const;
export type MessagingEvent = typeof MESSAGING_EVENTS[number];

export function sanitizeMessagingEvents(events: string[]): MessagingEvent[] {
    const allowed = new Set<string>(MESSAGING_EVENTS);
    return [...new Set(events.filter((e) => allowed.has(e)))] as MessagingEvent[];
}

/** Normalized message a provider renders into its own format. */
export interface MessagingMessage {
    event: MessagingEvent;
    title: string;
    body?: string;
    url?: string;
    /** Present for task events — lets the Slack provider attach Done/Assign action buttons. */
    taskId?: number;
    /** An extra line rendered at the bottom (e.g. assignees) — part of the original message. */
    footer?: string;
    /** Task's current completion state — the primary button is Reopen when true, else Done. */
    completed?: boolean;
    /** Whether to render interactive action buttons (Slack). Suppressed for content-hidden channels. */
    actions?: boolean;
}

export interface BuildMessagingMessageArgs {
    event: MessagingEvent;
    audience: 'personal' | 'project';
    body: string;
    url?: string;
    taskId?: number;
    projectName?: string | null;
    footer?: string;
    completed?: boolean;
    /** Overrides the title (keeps the subscription event but shows different wording, e.g. reopened). */
    titleOverride?: string;
    /** Whether to render interactive action buttons. Defaults to shown; false for content-hidden channels. */
    actions?: boolean;
}

export interface MessagingDeliverArgs {
    chatId: string;
    /** Decrypted per-connection secret (Slack bot token / webhook URL); null for Telegram (instance bot token from env). */
    accessToken: string | null;
    message: MessagingMessage;
}

export interface MessagingDeliverResult {
    success: boolean;
    errorCode?: number;
}

export interface MessagingDeliverJobData {
    connectionId: number;
    provider: MessagingProviderId;
    chatId: string;
    accessTokenEncrypted: string | null;
    message: MessagingMessage;
    attempt: number;
}

const NumberFromString = type('string|number').pipe((v) => Number(v));

// Derived from MESSAGING_PROVIDERS so adding a provider doesn't silently fail validation.
const MessagingProviderParam = type.enumerated(...MESSAGING_PROVIDERS);

export const MessagingArkTypeConnectLink = type({
    provider: MessagingProviderParam,
});
export type MessagingArgConnectLink = typeof MessagingArkTypeConnectLink.infer;

export const MessagingArkTypeById = type({
    id: NumberFromString,
});
export type MessagingArgById = typeof MessagingArkTypeById.infer;

export const MessagingArkTypeToggle = type({
    id: 'number',
    isActive: 'boolean',
});
export type MessagingArgToggle = typeof MessagingArkTypeToggle.infer;

export const MessagingArkTypeUpdateEvents = type({
    id: 'number',
    events: 'string[]',
});
export type MessagingArgUpdateEvents = typeof MessagingArkTypeUpdateEvents.infer;

// Project routes take goalId from IsProjectGoalOwner (res.locals), not the payload,
// so these schemas validate only the non-authorization fields.
export const MessagingArkTypeProviderParam = type({
    provider: MessagingProviderParam,
});
export type MessagingArgProviderParam = typeof MessagingArkTypeProviderParam.infer;

export const MessagingArkTypeProjectToggle = type({
    id: 'number',
    isActive: 'boolean',
});
export type MessagingArgProjectToggle = typeof MessagingArkTypeProjectToggle.infer;

export const MessagingArkTypeProjectDelete = type({
    id: 'number',
});
export type MessagingArgProjectDelete = typeof MessagingArkTypeProjectDelete.infer;

export const MessagingArkTypeProjectPostContent = type({
    id: 'number',
    postContent: 'boolean',
});
export type MessagingArgProjectPostContent = typeof MessagingArkTypeProjectPostContent.infer;
