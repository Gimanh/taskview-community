// import type { CollaborationRolesSchemaTypeForSelect } from 'taskview-db-schemas';
import type { AppUser } from '../../core/AppUser';
import { $logger } from '../../modules/logget';
// import { logError } from '../../utils/api';
import type {
    CollaborationArgAddRoleToGoal,
    CollaborationArgDeleteRoleFromGoal,
    CollaborationArgToggleRolePermission,
    CollaborationPermission,
    CollaborationRole,
    CollaborationRoleToPermission,
} from '../collaboration/collaboration.server.types';
import { CollaborationRolesRepository } from './CollaborationRolesRepository';
import type {
    AddRoleArg,
    DeleteRoleArg,
    FetchAllRolesForGoalArg,
    PermissionInDb,
    RoleInDb,
    TogglePermissionForRoleArgs,
} from './collaboration-roles.types';

export default class CollaborationRolesManager {
    private readonly user: AppUser;
    public readonly repository: CollaborationRolesRepository;

    constructor(user: AppUser) {
        this.user = user;
        this.repository = new CollaborationRolesRepository();
    }

    async fetchAllPermissions(): Promise<PermissionInDb[]> {
        const permissions = await this.repository.fetchAllAvailablePermissions();
        if (!permissions) {
            $logger.error('Can not fetch all permissions');
        }
        return permissions || [];
    }

    async fetchAllPermissionsNew(): Promise<CollaborationPermission[]> {
        const permissions = await this.repository.fetchAllAvailablePermissionsNew();
        return permissions.map((permission) => ({
            ...permission,
            permission_group: permission.permissionGroup,
            description_locales: JSON.stringify(permission.descriptionLocales),
            descriptionLocales: JSON.stringify(permission.descriptionLocales),
        }));
    }

    async addRole(args: AddRoleArg): Promise<RoleInDb | false> {
        const roleId = await this.repository.addRole(args.name, args.goalId);

        if (!roleId) {
            $logger.error('Can not add role');
            return false;
        }

        const role = await this.repository.fetchRecordById(roleId);

        if (!role) {
            $logger.error(`Can not fetch role by id ${roleId}`);
        }

        return role;
    }

    async addRoleNew(args: CollaborationArgAddRoleToGoal): Promise<CollaborationRole | null> {
        const role = await this.repository.addRoleNew(args.roleName, args.goalId);

        if (!role) {
            $logger.error('Can not add role');
            return null;
        }

        
        return {
            ...role,
            goal_id: role.goalId,
        };
    }

    async deleRole(data: DeleteRoleArg) {
        return await this.repository.deleteRole(data.id);
    }

    async deleteRoleNew(args: CollaborationArgDeleteRoleFromGoal): Promise<boolean> {
        const result = await this.repository.deleteRoleNew(args);
        return result;
    }

    async fetchRolesForGoal(data: FetchAllRolesForGoalArg) {
        const roles = await this.repository.fetchRolesForGoal(data.goalId);
        return roles;
    }

    async fetchRolesForGoalNew(goalId: number): Promise<CollaborationRole[]> {
        const roles = await this.repository.fetchRolesForGoalNew(goalId);
        return (
            roles?.map((role) => ({
                ...role,
                goal_id: role.goalId,
            })) ?? []
        );
    }

    async fetchAllRolesPermissionsForGoal(goalId: number) {
        return await this.repository.fetchAllRolesPermissionsForGoal(goalId);
    }

    /**
     * @deprecated use toggleRolePermissionNew instead
     * @param data
     * @returns
     */
    async toggleRolePermission(data: TogglePermissionForRoleArgs): Promise<boolean | -1> {
        try {
            const toggle = await this.repository.toggleRolePermission(data.roleId, data.permissionId);
            return toggle;
        } catch (_e: any) {
            $logger.error(data, `Can not fetch items role_to_permission`);
            return -1;
        }
    }

    async toggleRolePermissionNew(data: CollaborationArgToggleRolePermission): Promise<boolean | -1> {
        try {
            const toggle = await this.repository.toggleRolePermissionNew(data.roleId, data.permissionId);
            if (toggle === null) {
                return -1;
            }
            return toggle;
        } catch (_e: any) {
            $logger.error(data, `Can not fetch items role_to_permission`);
            return -1;
        }
    }

    async fetchRoleToPermissionsForGoalNew(goalId: number): Promise<CollaborationRoleToPermission[]> {
        const permissions = await this.repository.fetchRoleToPermissionsForGoalNew(goalId);
        return permissions.map((permission) => ({
            ...permission,
            role_id: permission.roleId,
            permission_id: permission.permissionId,
        }));
    }
}
