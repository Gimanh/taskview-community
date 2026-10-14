import { GoalPermissionsFetcher } from '../../core/GoalPermissionsFetcher';
import { logError } from '../../utils/api';
import { GoalPermissions } from '../../types/auth.types';
import type { AutomationCanRunArgs, AutomationHasPermissionsArgs } from './types';

export class AutomationPermissions {
    static async hasAll(args: AutomationHasPermissionsArgs): Promise<boolean> {
        const checker = await args.actor.permissionsFetcher
            .getPermissionsForType(args.goalId, GoalPermissionsFetcher.PERMISSION_TYPE_FOR_GOAL)
            .catch(logError);
        if (!checker) return false;
        return args.permissions.every((permission) => checker.hasPermissions(permission));
    }

    static async hasAny(args: AutomationHasPermissionsArgs): Promise<boolean> {
        const checker = await args.actor.permissionsFetcher
            .getPermissionsForType(args.goalId, GoalPermissionsFetcher.PERMISSION_TYPE_FOR_GOAL)
            .catch(logError);
        if (!checker) return false;
        return args.permissions.some((permission) => checker.hasPermissions(permission));
    }

    static async canRun(args: AutomationCanRunArgs): Promise<boolean> {
        return AutomationPermissions.hasAll({
            actor: args.actor,
            goalId: args.goalId,
            permissions: [GoalPermissions.AUTOMATION_CAN_MANAGE, ...args.action.requiredPermissions],
        });
    }
}
