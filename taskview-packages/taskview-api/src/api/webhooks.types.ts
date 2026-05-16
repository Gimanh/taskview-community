export type WebhookItem = {
    id: number;
    goalId: number;
    url: string;
    events: string[];
    isActive: boolean;
    createdAt: string | null;
    updatedAt: string | null;
};

export type WebhookArgCreate = {
    goalId: number;
    url: string;
    events: string[];
};

export type WebhookResponseCreate = {
    webhook: WebhookItem;
    secret: string;
};

export type WebhookArgUpdate = {
    id: number;
    url?: string;
    events?: string[];
    isActive?: boolean;
};

export type WebhookArgDelete = {
    id: number;
};

export type WebhookDeliveryItem = {
    id: number;
    webhookId: number;
    event: string;
    payload: unknown;
    status: string;
    responseCode: number | null;
    attempts: number;
    lastAttemptAt: string | null;
    createdAt: string | null;
};

export const WEBHOOK_EVENTS = [
    'task.created',
    'task.updated',
    'task.deleted',
    'task.assigneesChanged',
    'time-entry.started',
    'time-entry.stopped',
    'time-entry.created',
    'time-entry.updated',
    'time-entry.deleted',
] as const;

export type WebhookEvent = typeof WEBHOOK_EVENTS[number];
