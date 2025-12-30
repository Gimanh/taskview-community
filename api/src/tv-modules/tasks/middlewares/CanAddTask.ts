import type { NextFunction, Request, Response } from 'express';
import { GoalPermissionsFetcher } from '../../../core/GoalPermissionsFetcher';
import { $logger } from '../../../modules/logget';
import { GoalPermissions } from '../../../types/auth.types';
import { ALL_TASKS_LIST_ID, DEFAULT_ID } from '../../../types/tasks.types';
import { logError } from '../../../utils/api';

export const CanAddTask = async (req: Request, res: Response, next: NextFunction) => {
    const listId = req.body.componentId;

    if (!listId) {
        return res.status(400).end();
    }

    let permissions;
    if (Number(listId) === ALL_TASKS_LIST_ID && req.body.goalId && req.body.goalId !== DEFAULT_ID) {
        permissions = await req.appUser.permissionsFetcher
            .getPermissionsForType(Number(req.body.goalId), GoalPermissionsFetcher.PERMISSION_TYPE_FOR_GOAL)
            .catch(logError);
    } else {
        permissions = await req.appUser.permissionsFetcher
            .getPermissionsForType(Number(listId), GoalPermissionsFetcher.PERMISSION_TYPE_FOR_TASKLIST)
            .catch(logError);
    }

    if (!permissions) {
        $logger.error('Can not get permissions for CanAddTask middleware');
        return res.status(500).end();
    }

    if (
        permissions.hasPermissions(GoalPermissions.COMPONENT_CAN_ADD_TASKS) ||
        permissions.hasPermissions(GoalPermissions.TASKS_CAN_ADD_SUBTASKS)
    ) {
        return next();
    }

    return res.status(403).end();
};
