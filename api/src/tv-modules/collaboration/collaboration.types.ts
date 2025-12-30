import { z } from 'zod';
import { StringToNumber } from '../../types/app.types';

export const FetchGoalUsersArgSchema = z.object({
    goalId: StringToNumber,
});

export type FetchGoalUsersArg = z.infer<typeof FetchGoalUsersArgSchema>;

export type CollaborationUserInDb = {
    id: number;
    email: string;
    invitation_date: Date;
};

export type FetchUsersForGoal = {
    id: number;
    email: string;
    goal_id: number;
    invitation_date: string;
    role_id: number;
};

export const ToggleUserRolesArgScheme = z.object({
    userId: StringToNumber,
    roles: z.array(StringToNumber),
});

export type ToggleUserRolesArg = z.infer<typeof ToggleUserRolesArgScheme>;

export const AddUserArgScheme = z.object({
    goalId: StringToNumber,
    email: z.string(),
});

export type AddUserArg = z.infer<typeof AddUserArgScheme>;

export const DeleteUserArgScheme = z.object({
    goalId: StringToNumber,
    id: StringToNumber,
});

export type DeleteUserArg = z.infer<typeof DeleteUserArgScheme>;
