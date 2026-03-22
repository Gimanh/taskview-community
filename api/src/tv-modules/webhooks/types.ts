import { type } from 'arktype';

const NumberFromString = type('string|number').pipe((v) => Number(v));

export const WebhookArkTypeCreate = type({
    goalId: 'number',
    url: 'string',
    events: 'string[]',
});

export type WebhookArgCreate = typeof WebhookArkTypeCreate.infer;

export const WebhookArkTypeUpdate = type({
    id: 'number',
    'url?': 'string',
    'events?': 'string[]',
    'isActive?': 'boolean',
});

export type WebhookArgUpdate = typeof WebhookArkTypeUpdate.infer;

export const WebhookArkTypeDelete = type({
    id: 'number',
});

export type WebhookArgDelete = typeof WebhookArkTypeDelete.infer;

export const WebhookArkTypeFetch = type({
    goalId: NumberFromString,
});

export type WebhookArgFetch = typeof WebhookArkTypeFetch.infer;

export const WebhookArkTypeById = type({
    id: NumberFromString,
});

export type WebhookArgById = typeof WebhookArkTypeById.infer;

const OptionalNumberFromString = type('string|number|undefined').pipe((v) => v === undefined ? undefined : Number(v));

export const WebhookArkTypeFetchDeliveries = type({
    id: NumberFromString,
    'cursor?': OptionalNumberFromString,
    'status?': 'string',
});

export type WebhookArgFetchDeliveries = typeof WebhookArkTypeFetchDeliveries.infer;

export const WEBHOOK_EVENTS = [
    'task.created',
    'task.updated',
    'task.deleted',
    'task.assigneesChanged',
] as const;

export type WebhookEvent = typeof WEBHOOK_EVENTS[number];

export interface WebhookDeliverJobData {
    deliveryId: number;
    webhookId: number;
    url: string;
    secretEncrypted: string;
    payload: object;
    attempt: number;
}
