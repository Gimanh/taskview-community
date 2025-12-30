import type { GoalPermissionItemsFromDb, GoalPermissionsForClient, GoalPermissionType } from '../types/auth.types';

export class GoalPermissionsChecker {
    private readonly permissions: GoalPermissionsForClient = {};

    constructor(permissions: GoalPermissionItemsFromDb) {
        permissions.forEach((item) => {
            this.permissions[item.permissionName] = true;
        });
    }

    hasPermissions(permission: GoalPermissionType): boolean {
        return !!this.permissions[permission];
    }

    getAllPermissions() {
        return this.permissions;
    }

    toJSON() {
        return this.permissions;
    }
}
