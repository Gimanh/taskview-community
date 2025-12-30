import { GoalPermissionsFetcher } from '../../core/GoalPermissionsFetcher';
import type { GoalPermissionType, PermissionsEntityType } from '../../types/auth.types';
import { isNotNullable } from '../../utils/helpers';
import { TaskFieldPermissionsForEditOrCreation } from '../tasks/tasks.server.types';

type EntityType = 'goal' | 'task' | 'goal_list';

/**
 * This class is used to check if the user has the permission to access the entity
 * You can use this class in middlewares to check if the user has the permission to access the entity
 * We use this class for checking permissions for updating and creating entities (for displaying fields we use )
 */
export class EntryUpdatePermissionChecker {
    protected data: Record<string, unknown>;
    protected type: EntityType;
    protected permissionsFetcher: GoalPermissionsFetcher;
    protected message?: string;

    constructor(data: Record<string, unknown>, type: EntityType, permissionsFetcher: GoalPermissionsFetcher) {
        this.data = data;
        this.type = type;
        this.permissionsFetcher = permissionsFetcher;
    }

    async check(): Promise<boolean> {
        const requiredPermissions = this.getAllNeededPermissions();

        if (!requiredPermissions.length) {
            this.message = 'Can not get required permissions for EntityPermissionChecker. Permissions are empty.';
            return false;
        }

        const [id, type] = this.getEntityId();

        if (!id || !type) {
            this.message = 'Can not get entity id or type for EntityPermissionChecker.';
            return false;
        }

        const checker = await this.permissionsFetcher.getPermissionsForType(id, type as PermissionsEntityType);

        for (const permission of requiredPermissions) {
            if (!checker.hasPermissions(permission)) {
                this.message = `You do not have permission to ${permission}`;
                return false;
            }
        }

        return true;
    }

    getAllNeededPermissions(): GoalPermissionType[] {
        const permissions = this.getPermissionsForEntry();
        if (!permissions) return [];
        return Object.keys(this.data)
            .map((key) => permissions[key])
            .filter(isNotNullable);
    }

    getPermissionsForEntry(): Record<string, GoalPermissionType> | undefined {
        switch (this.type) {
            case 'task':
                return TaskFieldPermissionsForEditOrCreation;
            default:
                return;
        }
    }

    getEntityId(): [number, PermissionsEntityType | undefined] {
        switch (this.type) {
            case 'task':
                // if id is not set, use goalId because it's the only way to get permissions (we are reading permissions for goal)
                if (!this.data.id) {
                    return [this.data.goalId as number, GoalPermissionsFetcher.PERMISSION_TYPE_FOR_GOAL];
                }
                return [this.data.id as number, GoalPermissionsFetcher.PERMISSION_TYPE_FOR_TASK];
            default:
                return [-1, undefined];
        }
    }
}
