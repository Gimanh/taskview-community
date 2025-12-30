import { type } from 'arktype';
import type { NextFunction, Request, Response } from 'express';
import { GoalPermissionsFetcher } from '../../../core/GoalPermissionsFetcher';
import { $logger } from '../../../modules/logget';
import { GoalPermissions } from '../../../types/auth.types';
import { logError } from '../../../utils/api';
import { TaskArkTypeFetchTaskHistory } from '../tasks.server.types';

export const CanFetchTaskHistory = async (req: Request, res: Response, next: NextFunction) => {
    const data = TaskArkTypeFetchTaskHistory(req.params);

    if (data instanceof type.errors) {
        return res.status(400).send(data.summary);
    }

    const permissions = await req.appUser.permissionsFetcher
        .getPermissionsForType(Number(data.taskId), GoalPermissionsFetcher.PERMISSION_TYPE_FOR_TASK)
        .catch(logError);

    if (!permissions) {
        $logger.error('Can not get permissions for CanAddTask middleware');
        return res.status(500).end();
    }

    if (permissions.hasPermissions(GoalPermissions.TASKS_CAN_ACCESS_HISTORY)) {
        return next();
    }

    return res.status(403).end();
};
