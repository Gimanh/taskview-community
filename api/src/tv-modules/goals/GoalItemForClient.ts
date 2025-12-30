import type { GoalPermissionsForClient, GoalPermissionType } from '../../types/auth.types';
import type { GoalItemInDb } from '../../types/goal.type';

export class GoalItemForClient {
    id: number;
    name: string;
    description: string;
    color: string;
    owner: number;
    archive: 1 | 0;
    permissions: GoalPermissionsForClient;

    constructor(item: GoalItemInDb, permissions: { [key in GoalPermissionType]?: true }) {
        this.id = item.id;
        this.name = item.name;
        this.description = item.description;
        this.color = item.color;
        this.owner = item.owner;
        this.archive = item.archive;
        this.permissions = permissions;
    }

    hasPermissions(name: GoalPermissionType): boolean {
        return !!this.permissions[name];
    }
}
