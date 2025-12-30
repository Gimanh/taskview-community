import { type } from 'arktype';
import { z } from 'zod';
import { StringToNumber } from '../../types/app.types';

export type TagItemInDb = {
    id: number;
    name: string;
    color: string;
    owner: number;
    goal_id: number | null;
};

/** @deprecated use TagItemArkTypeAdd instead */
export const AddTagArgScheme = z.object({
    color: z.string(),
    goalId: StringToNumber.nullable(),
    name: z.string(),
});

export type AddTagArg = z.infer<typeof AddTagArgScheme>;

export const ToggleTagArgScheme = z.object({
    tagId: StringToNumber,
    taskId: StringToNumber,
});

export type ToggleTagArg = z.infer<typeof ToggleTagArgScheme>;

export const DeleteTagArgScheme = z.object({
    tagId: StringToNumber,
});

export type DeleteTagArg = z.infer<typeof DeleteTagArgScheme>;

export const UpdateTagArgsScheme = z.object({
    color: z.string(),
    goalId: StringToNumber.nullable(),
    id: StringToNumber,
    name: z.string(),
    owner: StringToNumber,
});

export type UpdateTagArgs = z.infer<typeof UpdateTagArgsScheme>;

export type TagToTaskInDb = {
    tag_id: number;
    task_id: number;
};

// ---------- NEW TYPES ----------

export const TagItemArkTypeAdd = type({
    name: 'string',
    color: 'string',
    goalId: 'number',
});

export type TagItemArgAdd = typeof TagItemArkTypeAdd.infer;

export const TagItemArkTypeDelete = type({
    tagId: 'number',
});

export type TagItemArgDelete = typeof TagItemArkTypeDelete.infer;

export const TagItemArkTypeUpdate = type({
    color: 'string',
    goalId: 'number',
    id: 'number',
    name: 'string',
});

export type TagItemArgUpdate = typeof TagItemArkTypeUpdate.infer;

export const TagItemArkTypeToggle = type({
    tagId: 'number',
    taskId: 'number',
});

export type TagItemArgToggle = typeof TagItemArkTypeToggle.infer;
