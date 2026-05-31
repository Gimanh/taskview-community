import type { NextFunction, Request, Response } from 'express';
import { GoalPermissionsFetcher } from '../../../core/GoalPermissionsFetcher';
import { $logger } from '../../../modules/logget';
import { GoalPermissions } from '../../../types/auth.types';
import { logError } from '../../../utils/api';

export const canAssignSprintTasks = async (req: Request, res: Response, next: NextFunction) => {
    const taskId = req.params.taskId ?? req.body?.taskId;
    if (!taskId) return res.status(400).end();

    const permissions = await req.appUser.permissionsFetcher
        .getPermissionsForType(Number(taskId), GoalPermissionsFetcher.PERMISSION_TYPE_FOR_TASK)
        .catch(logError);

    if (!permissions) {
        $logger.error('Can not get permissions for canAssignSprintTasks middleware');
        return res.status(500).end();
    }

    if (permissions.hasPermissions(GoalPermissions.SPRINT_CAN_ASSIGN_TASKS)) return next();
    return res.status(403).end();
};
