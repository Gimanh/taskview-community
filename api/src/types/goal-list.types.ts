import { z } from 'zod';
import { StringToNumber } from './app.types';

export type GoalListInDb = {
    id: number;
    name: string;
    description: string;
    date_creation: string;
    goal_id: number;
    owner: number;
    creator_id: number;
    edit_date: string;
    archive: 0 | 1;
};

export const UpdateGoalListSchema = z.object({
    id: StringToNumber,
    name: z.string(),
});

export const UpdateGoalListArchiveSchema = z.object({
    id: StringToNumber.optional(),
    goalId: StringToNumber.optional(),
    archive: z.union([z.literal(0), z.literal(1)]),
});
