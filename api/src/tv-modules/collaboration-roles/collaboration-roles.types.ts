import { z } from 'zod';
import { StringToNumber } from '../../types/app.types';

export const FetchAllRolesForGoalArgSchema = z.object({
    goalId: StringToNumber,
});

export type FetchAllRolesForGoalArg = z.infer<typeof FetchAllRolesForGoalArgSchema>;

export type PermissionInDb = {
    id: number;
    name: string;
    description: string;
    permission_group: number;
    description_locales: { en: string; ru: string };
};

export const AddRoleArgSchema = z.object({
    goalId: StringToNumber,
    name: z.string(),
});

export type AddRoleArg = z.infer<typeof AddRoleArgSchema>;

export type RoleInDb = {
    id: string;
    name: string;
    goal_id: number;
    created: Date;
};

export const DeleteRoleArgScheme = z.object({
    id: StringToNumber,
    goalId: StringToNumber,
});

export type DeleteRoleArg = z.infer<typeof DeleteRoleArgScheme>;

export type PermissionToRoleInDb = {
    role_id: number;
    permission_id: number;
};

export const FetchAllPermissionsWithRoleArgsSchene = z.object({
    goalId: StringToNumber,
});

export const TogglePermissionForRoleArgsScheme = z.object({
    goalId: StringToNumber,
    permissionId: StringToNumber,
    roleId: StringToNumber,
});

export type TogglePermissionForRoleArgs = z.infer<typeof TogglePermissionForRoleArgsScheme>;
