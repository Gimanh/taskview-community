import type { NextFunction, Request, Response } from 'express';
import { GoalPermissionsFetcher } from '../../../core/GoalPermissionsFetcher';
import { $logger } from '../../../modules/logget';
import { GoalPermissions } from '../../../types/auth.types';
import { logError } from '../../../utils/api';

export const canManageGoalUsers = async (req: Request, res: Response, next: NextFunction) => {
    const permissions = await req.appUser.permissionsFetcher
        .getPermissionsForType(req.body.goalId, GoalPermissionsFetcher.PERMISSION_TYPE_FOR_GOAL)
        .catch(logError);

    if (!permissions) {
        $logger.error('Can not get permissions for canManageGoalUsers middleware');
        return res.status(500).end();
    }

    if (permissions.hasPermissions(GoalPermissions.GOAL_CAN_MANAGE_USERS)) {
        return next();
    }

    return res.status(403).end();
};
