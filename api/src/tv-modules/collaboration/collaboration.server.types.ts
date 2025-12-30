import { type } from 'arktype';

export const CollaborationArkTypeAddUser = type({
    goalId: 'number',
    email: 'string.email',
});

export type CollaborationArgAddUser = typeof CollaborationArkTypeAddUser.infer;

export const CollaborationArkTypeDeleteUser = type({
    goalId: 'number',
    id: 'number',
});

export type CollaborationArgDeleteUser = typeof CollaborationArkTypeDeleteUser.infer;

export const CollaborationArkTypeToggleUserRoles = type({
    goalId: 'number',
    userId: 'number',
    roles: 'number[]',
});

export type CollaborationArgToggleUserRoles = typeof CollaborationArkTypeToggleUserRoles.infer;

export type CollaborationUserWithRoles = {
    id: number;
    email: string;
    goal_id: number | null;
    goalId: number | null;
    invitation_date: string | null;
    invitationDate: string | null;
    roles: number[];
    goalOwner?: boolean;
};

export const CollaborationArkTypeFetchUsersForGoal = type({
    goalId: type('string').pipe((v) => Number(v)),
});

export type CollaborationArgFetchUsersForGoal = typeof CollaborationArkTypeFetchUsersForGoal.infer;

export const CollaborationArkTypeAddRoleToGoal = type({
    goalId: 'number',
    roleName: 'string',
});

export type CollaborationArgAddRoleToGoal = typeof CollaborationArkTypeAddRoleToGoal.infer;

export type CollaborationRole = {
    id: number;
    name: string;
    goal_id: number;
    goalId: number;
    created: string | null;
};

export const CollaborationArkTypeDeleteRoleFromGoal = type({
    goalId: 'number',
    id: 'number',
});

export type CollaborationArgDeleteRoleFromGoal = typeof CollaborationArkTypeDeleteRoleFromGoal.infer;

export type CollaborationPermission = {
    id: number;
    name: string;
    description: string | null;
    permission_group: number | null;
    permissionGroup: number | null;
    description_locales: string;
    descriptionLocales: string;
};

export const CollaborationArkTypeFetchRolesForGoalNew = type({
    goalId: type('string').pipe((v) => Number(v)),
});

export type CollaborationArgFetchRolesForGoalNew = typeof CollaborationArkTypeFetchRolesForGoalNew.infer;

export const CollaborationArkTypeFetchRoleToPermissionsForGoalNew = type({
    goalId: type('string').pipe((v) => Number(v)),
});

export type CollaborationArgFetchRoleToPermissionsForGoalNew =
    typeof CollaborationArkTypeFetchRoleToPermissionsForGoalNew.infer;

export type CollaborationRoleToPermission = {
    roleId: number | null;
    permissionId: number | null;
    role_id: number | null;
    permission_id: number | null;
};

export const CollaborationArkTypeToggleRolePermission = type({
    permissionId: 'number',
    roleId: 'number',
});

export type CollaborationArgToggleRolePermission = typeof CollaborationArkTypeToggleRolePermission.infer;
