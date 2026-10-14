import type { NextFunction, Request, Response } from 'express';
import { GoalPermissionsFetcher } from '../../../core/GoalPermissionsFetcher';
import { $logger } from '../../../modules/logget';
import { GoalPermissions } from '../../../types/auth.types';
import { logError } from '../../../utils/api';
import type { RequireAutomationPermissionArgs } from '../types';

export function requireAutomationPermission({ permission, resolveGoalId }: RequireAutomationPermissionArgs) {
    return async (req: Request, res: Response, next: NextFunction) => {
        const goalId = await resolveGoalId(req);
        if (!goalId) return res.status(404).end();

        const permissions = await req.appUser.permissionsFetcher
            .getPermissionsForType(goalId, GoalPermissionsFetcher.PERMISSION_TYPE_FOR_GOAL)
            .catch(logError);

        if (!permissions) {
            $logger.error('Can not resolve automation permissions');
            return res.status(500).end();
        }

        const granted =
            permissions.hasPermissions(permission) ||
            (permission === GoalPermissions.AUTOMATION_CAN_VIEW && permissions.hasPermissions(GoalPermissions.AUTOMATION_CAN_MANAGE));
        if (granted) return next();
        return res.status(403).end();
    };
}
