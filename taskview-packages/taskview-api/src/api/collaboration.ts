import type { AppResponse } from "..";
import TvApiBase from "./base";
import type {
    CollaborationArgCreateRoleForGoal,
    CollaborationArgAddUser,
    CollaborationArgDeleteRoleFromGoal,
    CollaborationArgDeleteUser,
    CollaborationArgToggleRolePermission,
    CollaborationArgToggleUserRoles,
    CollaborationPermission,
    CollaborationResponseCreateRoleForGoal,
    CollaborationResponseAddUser,
    CollaborationResponseDeleteRoleFromGoal,
    CollaborationResponseDeleteUser,
    CollaborationResponseFetchAllUsers,
    CollaborationResponseToggleRolePermission,
    CollaborationResponseToggleUserRoles,
    CollaborationRole,
    CollaborationRoleToPermission,
} from "./collaboration.types";

export class TvCollaborationApi extends TvApiBase {
    private readonly moduleUrl = '/module/collaboration';
    private readonly moduleRolesUrl = '/module/collaborationroles';

    public async inviteUserToGoal(data: CollaborationArgAddUser) {
        return this.request(
            this.$axios.post<AppResponse<CollaborationResponseAddUser>>(
                `${this.moduleUrl}`, data
            )
        );
    }

    public async deleteUserFromGoal(data: CollaborationArgDeleteUser) {
        return this.request(
            this.$axios.delete<AppResponse<CollaborationResponseDeleteUser>>(
                `${this.moduleUrl}`, { data: data }
            )
        );
    }

    public async fetchAllUsers() {
        return this.request(
            this.$axios.get<AppResponse<CollaborationResponseFetchAllUsers[]>>(
                `${this.moduleUrl}`
            )
        );
    }

    public async fetchUsersForGoal(goalId: number) {
        return this.request(
            this.$axios.get<AppResponse<CollaborationResponseFetchAllUsers[]>>(
                `${this.moduleUrl}/${goalId}`
            )
        );
    }

    public async toggleUserRoles(data: CollaborationArgToggleUserRoles) {
        return this.request(
            this.$axios.patch<AppResponse<CollaborationResponseToggleUserRoles>>(
                `${this.moduleUrl}`, data
            )
        );
    }

    public async createRoleForGoal(data: CollaborationArgCreateRoleForGoal) {
        return this.request(
            this.$axios.post<AppResponse<CollaborationResponseCreateRoleForGoal>>(
                `${this.moduleRolesUrl}`, data
            )
        );
    }

    public async deleteRoleFromGoal(data: CollaborationArgDeleteRoleFromGoal) {
        return this.request(
            this.$axios.delete<AppResponse<CollaborationResponseDeleteRoleFromGoal>>(
                `${this.moduleRolesUrl}`, { data: data }
            )
        );
    }

    public async fetchAllPermissions() {
        return this.request(
            this.$axios.get<AppResponse<CollaborationPermission[]>>(
                `${this.moduleRolesUrl}/all-permissions`
            )
        );
    }

    public async fetchRolesForGoal(goalId: number) {
        return this.request(
            this.$axios.get<AppResponse<CollaborationRole[]>>(
                `${this.moduleRolesUrl}/${goalId}`
            )
        );
    }

    public async fetchRoleToPermissionsForGoal(goalId: number) {
        return this.request(
            this.$axios.get<AppResponse<CollaborationRoleToPermission[]>>(
                `${this.moduleRolesUrl}/role-to-permissions/${goalId}`
            )
        );
    }

    public async toggleRolePermission(data: CollaborationArgToggleRolePermission) {
        return this.request(
            this.$axios.patch<AppResponse<CollaborationResponseToggleRolePermission>>(
                `${this.moduleRolesUrl}/role-permission`, data
            )
        );
    }
}