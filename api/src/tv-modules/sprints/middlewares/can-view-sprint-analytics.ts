import type { NextFunction, Request, Response } from 'express';
import { GoalPermissionsFetcher } from '../../../core/GoalPermissionsFetcher';
import { $logger } from '../../../modules/logget';
import { GoalPermissions } from '../../../types/auth.types';
import { logError } from '../../../utils/api';
import { resolveGoalId } from './resolve-goal-id';

export const canViewSprintAnalytics = async (req: Request, res: Response, next: NextFunction) => {
    const goalId = await resolveGoalId(req);
    if (!goalId) return res.status(400).end();

    const permissions = await req.appUser.permissionsFetcher
        .getPermissionsForType(goalId, GoalPermissionsFetcher.PERMISSION_TYPE_FOR_GOAL)
        .catch(logError);

    if (!permissions) {
        $logger.error('Can not get permissions for canViewSprintAnalytics middleware');
        return res.status(500).end();
    }

    if (permissions.hasPermissions(GoalPermissions.SPRINT_CAN_VIEW_ANALYTICS)) return next();
    return res.status(403).end();
};
