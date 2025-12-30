import { type } from 'arktype';
import { z } from 'zod';
import { StringToNumber } from '../../types/app.types';

// ============ Arktype schemas ============

const NumberFromString = type('string|number').pipe((v) => Number(v));

export const KanbanArkTypeFetchAllStatuses = type({
    goalId: NumberFromString,
});

export const KanbanArkTypeStatusUpdate = type({
    id: NumberFromString,
    name: 'string',
    'viewOrder?': NumberFromString,
});

export const KanbanArkTypeDeleteStatus = type({
    id: NumberFromString,
});

export const KanbanArkTypeAddStatus = type({
    goalId: NumberFromString,
    name: 'string',
});

export type KanbanArgAddStatus = typeof KanbanArkTypeAddStatus.infer;

export type KanbanArgDeleteStatus = typeof KanbanArkTypeDeleteStatus.infer;

export type KanbanArgUpdateStatus = typeof KanbanArkTypeStatusUpdate.infer;

export type KanbanArgFetchAllStatuses = typeof KanbanArkTypeFetchAllStatuses.infer;

export type KanbanStatusInDb = {
    id: number;
    goal_id: number;
    name: string;
    view_order: number;
};

export const KanbanArkTypeStatusToClient = type({
    id: 'number',
    goal_id: 'number',
    name: 'string',
    view_order: 'number',
}).pipe((item) => ({
    id: item.id,
    goalId: item.goal_id,
    name: item.name,
    viewOrder: item.view_order,
}));

export type KanbanStatusClient = typeof KanbanArkTypeStatusToClient.infer;

export const KanbanArkTypeFetchTasksForColumn = type({
    goalId: NumberFromString,
    columnId: type('string|number|null').pipe((v) => (v === 'null' || v === null) ? null : Number(v)),
    cursor: type('string|number|null').pipe((v) => (v === 'null' || v === null) ? null : Number(v)),
});

export type KanbanArgFetchTasksForColumn = typeof KanbanArkTypeFetchTasksForColumn.infer;

export const KanbanArkTypeGetTasksOrderForColumnAndCursor = type({
    goalId: NumberFromString,
    columnId: type('string|number|null').pipe((v) => (v === 'null' || v === null) ? null : Number(v)),
    cursor: type('string|number|null').pipe((v) => (v === 'null' || v === null) ? null : Number(v)),
});

export type KanbanArgGetTasksOrderForColumnAndCursor = typeof KanbanArkTypeGetTasksOrderForColumnAndCursor.infer;

export const KanbanArkTypeUpdateTasksOrder = type({
    goalId: NumberFromString,
    columnId: type('string|number|null').pipe((v) => (v === 'null' || v === null) ? null : Number(v)),
    taskId: NumberFromString,
    prevTaskId: type('string|number|null').pipe((v) => (v === 'null' || v === null) ? null : Number(v)),
    nextTaskId: type('string|number|null').pipe((v) => (v === 'null' || v === null) ? null : Number(v)),
});

export type KanbanArgUpdateTasksOrder = typeof KanbanArkTypeUpdateTasksOrder.infer;

export const KanbanArkTypeCanManageKanban = type({
    goalId: NumberFromString,
});

export type KanbanArgCanManageKanban = typeof KanbanArkTypeCanManageKanban.infer;

// ============ Deprecated Zod schemas ============

/** @deprecated */
export const KanbanSchemaFetchAllStatuses = z.object({
    goalId: StringToNumber,
});

/** @deprecated */
export const KanbanSchemaStatusUpdate = z.object({
    id: StringToNumber,
    name: z.string(),
    viewOrder: StringToNumber.optional(),
});

/** @deprecated */
export const KanbanSchemsDeleteStatus = z.object({
    id: StringToNumber,
});

/** @deprecated */
export const KanbanSchemaAddStatus = z.object({
    goalId: StringToNumber,
    name: z.string(),
});

/** @deprecated */
export type KanbanAddStatus = z.infer<typeof KanbanSchemaAddStatus>;

/** @deprecated */
export type DeleteKanbanStatus = z.infer<typeof KanbanSchemsDeleteStatus>;

/** @deprecated */
export type UpdateKanbanStatus = z.infer<typeof KanbanSchemaStatusUpdate>;

/** @deprecated */
export type FetchAllColumns = z.infer<typeof KanbanSchemaFetchAllStatuses>;

/** @deprecated */
export type KanbanStatusItemInDb = {
    id: number;
    goal_id: number;
    name: string;
    view_order: number;
};

/** @deprecated */
export const KanbanStatusToClientSchema = z
    .object({
        id: z.number(),
        goal_id: z.number(),
        name: z.string(),
        view_order: z.number(),
    })
    .transform((item) => ({
        id: item.id,
        goalId: item.goal_id,
        name: item.name,
        viewOrder: item.view_order,
    }));

/** @deprecated */
export type KanbanStatusForClient = z.infer<typeof KanbanStatusToClientSchema>;
