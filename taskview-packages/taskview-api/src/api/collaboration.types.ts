export type CollaborationArgAddUser = {
    goalId: number;
    email: string;
}

export type CollaborationUser = {
    id: number;
    email: string;
    invitationDate: Date;
}

export type CollaborationResponseAddUser = CollaborationResponseFetchAllUsers | null;

export type CollaborationArgDeleteUser = {
    goalId: number;
    id: number;
}

export type CollaborationResponseDeleteUser = boolean

export type CollaborationResponseFetchAllUsers = CollaborationUser & {
    goal_id: number;
    goalId: number;
    invitation_date: string;
    roles: number[];
    goalOwner: boolean;
}

export type CollaborationArgCreateRoleForGoal = {
    goalId: number;
    roleName: string;
}

export type CollaborationRole = {
    id: number;
    name: string;
    goal_id: number;
    goalId: number;
    created: string;
}

export type CollaborationResponseCreateRoleForGoal = CollaborationRole | null;

export type CollaborationArgDeleteRoleFromGoal = {
    goalId: number;
    id: number;
}

export type CollaborationResponseDeleteRoleFromGoal = boolean;

//FIXME describe each group differently
export type PermissionGroupsIds = 1 | 2 | 3 | 4;

export type CollaborationPermission = {
    id: number;
    name: string;
    description: string;
    permission_group: PermissionGroupsIds;
    permissionGroup: PermissionGroupsIds;
    description_locales: string;
    descriptionLocales: string;
}

export type CollaborationRoleToPermission = {
    roleId: number | null;
    permissionId: number | null;
    role_id: number | null;
    permission_id: number | null;
}

export type CollaborationArgToggleRolePermission = {
    permissionId: number;
    roleId: number;
}

export type CollaborationResponseToggleRolePermission = {
    add: boolean;
}

export type CollaborationArgToggleUserRoles = {
    userId: number;
    goalId: number;
    roles: number[];
}

export type CollaborationResponseToggleUserRoles = number[]
