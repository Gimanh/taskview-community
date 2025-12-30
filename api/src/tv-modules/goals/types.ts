import { type } from 'arktype';
import type { GoalsSchemaTypeForSelect } from 'taskview-db-schemas';
import type { GoalPermissionsForClient } from '../../types/auth.types';

export const GoalsArkTypeAdd = type({
    name: 'string',
    'description?': 'string | null',
    'color?': 'string | null',
});

export type GoalsArgAdd = typeof GoalsArkTypeAdd.infer;

export const GoalsArkTypeUpdate = type({
    id: 'number',
    'name?': 'string | null',
    'description?': 'string | null',
    'color?': 'string | null',
});

export type GoalsArgUpdate = typeof GoalsArkTypeUpdate.infer;

export const GoalsArkTypeDelete = type({
    goalId: 'number',
});

export type GoalsArgDelete = typeof GoalsArkTypeDelete.infer;

export type GoalsItemForClientWithPermissions = GoalsSchemaTypeForSelect & { permissions: GoalPermissionsForClient };
