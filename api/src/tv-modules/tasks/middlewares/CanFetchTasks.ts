import type { NextFunction, Request, Response } from 'express';
import { GoalPermissionsFetcher } from '../../../core/GoalPermissionsFetcher';
import { $logger } from '../../../modules/logget';
import { GoalPermissions } from '../../../types/auth.types';
import { ALL_TASKS_LIST_ID } from '../../../types/tasks.types';
import { logError } from '../../../utils/api';

export const CanFetchTasks = async (req: Request, res: Response, next: NextFunction) => {
    const listId = req.query.componentId;

    if (!listId) {
        return res.status(400).end();
    }

    let permissions;

    if (+listId === ALL_TASKS_LIST_ID) {
        if (!req.query.goalId) {
            return res.status(400).end();
        }
        permissions = await req.appUser.permissionsFetcher
            .getPermissionsForType(Number(req.query.goalId), GoalPermissionsFetcher.PERMISSION_TYPE_FOR_GOAL)
            .catch(logError);
    } else {
        permissions = await req.appUser.permissionsFetcher
            .getPermissionsForType(Number(listId), GoalPermissionsFetcher.PERMISSION_TYPE_FOR_TASKLIST)
            .catch(logError);
    }

    if (!permissions) {
        $logger.error('Can not get permissions for CanFetchTasks');
        return res.status(500).end();
    }

    if (permissions.hasPermissions(GoalPermissions.COMPONENT_CAN_WATCH_CONTENT)) {
        return next();
    }

    return res.status(403).end();
};
