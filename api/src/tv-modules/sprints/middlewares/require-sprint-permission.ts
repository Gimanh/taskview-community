import type { NextFunction, Request, Response } from 'express';
import { GoalPermissionsFetcher } from '../../../core/GoalPermissionsFetcher';
import { $logger } from '../../../modules/logget';
import type { GoalPermissionType } from '../../../types/auth.types';
import { logError } from '../../../utils/api';

type GoalIdResolver = (req: Request) => Promise<number | null> | number | null;

export function requireSprintPermission(permission: GoalPermissionType, resolveGoalId: GoalIdResolver) {
    return async (req: Request, res: Response, next: NextFunction) => {
        const goalId = await resolveGoalId(req);
        if (!goalId) return res.status(400).end();

        const permissions = await req.appUser.permissionsFetcher
            .getPermissionsForType(goalId, GoalPermissionsFetcher.PERMISSION_TYPE_FOR_GOAL)
            .catch(logError);

        if (!permissions) {
            $logger.error('Can not resolve sprint permissions');
            return res.status(500).end();
        }

        if (permissions.hasPermissions(permission)) return next();
        return res.status(403).end();
    };
}
