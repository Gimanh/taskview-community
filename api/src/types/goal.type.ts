import { z } from 'zod';
import { StringToNumber } from './app.types';

export type GoalItemInDb = {
    id: number;
    name: string;
    description: string;
    color: string;
    date_creation: string;
    owner: number;
    creator_id: number;
    edit_date: string;
    archive: 1 | 0;
};

export type GoalItemsInDb = GoalItemInDb[];

export const AddGoalToDbArgSchema = z.object({
    name: z.string(),
    userId: z.number(),
    description: z.string().optional(),
});

export type AddGoalToDbArg = z.infer<typeof AddGoalToDbArgSchema>;

export const UpdateGoalDbArgSchema = z.object({
    id: z
        .union([z.string(), z.number()])
        .transform((value) => Number(value))
        .refine((val) => !isNaN(val), { message: 'Invalid number' }),
    name: z.string(),
    description: z.string().optional(),
});

export type UpdateGoalDbArg = z.infer<typeof UpdateGoalDbArgSchema>;

export const DeleteGoalDbArgSchema = z.object({
    goalId: z
        .union([z.string(), z.number()])
        .transform((value) => Number(value))
        .refine((val) => !isNaN(val), { message: 'Invalid number' }),
});

export type DeleteGoalDbArg = z.infer<typeof DeleteGoalDbArgSchema>;

export const UpdateGoalArchiveScheme = z.object({
    goalId: StringToNumber,
    archive: z.union([z.literal(0), z.literal(1)]),
});
