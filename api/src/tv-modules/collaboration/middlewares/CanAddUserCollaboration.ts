import type { NextFunction, Request, Response } from 'express';
import { GoalPermissionsFetcher } from '../../../core/GoalPermissionsFetcher';
import { $logger } from '../../../modules/logget';
import { GoalPermissions } from '../../../types/auth.types';
import { logError } from '../../../utils/api';

export const CanAddUserCollaboration = async (req: Request, res: Response, next: NextFunction) => {
    const goalId = req.body.goalId;

    if (!goalId) {
        return res.status(400).end();
    }

    const permissions = await req.appUser.permissionsFetcher
        .getPermissionsForType(Number(goalId), GoalPermissionsFetcher.PERMISSION_TYPE_FOR_GOAL)
        .catch(logError);

    if (!permissions) {
        $logger.error('Can not get permissions for CanAddUserCollaboration middleware');
        return res.status(500).end();
    }

    if (permissions.hasPermissions(GoalPermissions.GOAL_CAN_MANAGE_USERS)) {
        return next();
    }

    return res.status(403).end();
};
