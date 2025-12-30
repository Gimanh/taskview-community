import type { NextFunction, Request, Response } from 'express';
import { GoalPermissionsFetcher } from '../../../core/GoalPermissionsFetcher';
import { $logger } from '../../../modules/logget';
import { GoalPermissions } from '../../../types/auth.types';
import { logError } from '../../../utils/api';

export const CanFetchTask = async (req: Request, res: Response, next: NextFunction) => {
    const taskId = req.query.taskId || req.params.taskId;

    if (!taskId) {
        return res.status(400).end();
    }

    const permissions = await req.appUser.permissionsFetcher
        .getPermissionsForType(Number(taskId), GoalPermissionsFetcher.PERMISSION_TYPE_FOR_TASK)
        .catch(logError);

    if (!permissions) {
        $logger.error('Can not get permissions for CanFetchTasks');
        return res.status(500).end();
    }

    if (permissions.hasPermissions(GoalPermissions.COMPONENT_CAN_WATCH_CONTENT)) {
        return next();
    }

    return res
        .status(403)
        .send(`You don't have permission ${GoalPermissions.COMPONENT_CAN_WATCH_CONTENT} to fetch task ${taskId}`);
};
