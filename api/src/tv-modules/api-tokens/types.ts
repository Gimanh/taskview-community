import { type } from 'arktype';

export const ApiTokenArkTypeCreate = type({
    name: 'string',
    'allowedPermissions?': 'string[]',
    'allowedGoalIds?': 'number[]',
    'expiresAt?': 'string|null',
});

export type ApiTokenArgCreate = typeof ApiTokenArkTypeCreate.infer;

export const ApiTokenArkTypeDelete = type({
    id: 'number',
});

export type ApiTokenArgDelete = typeof ApiTokenArkTypeDelete.infer;

export const TOKEN_PREFIX = 'tvk_';
