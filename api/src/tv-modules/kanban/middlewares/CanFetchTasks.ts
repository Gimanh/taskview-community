import type { NextFunction, Request, Response } from 'express';
import { GoalPermissionsFetcher } from '../../../core/GoalPermissionsFetcher';
import { $logger } from '../../../modules/logget';
import { GoalPermissions } from '../../../types/auth.types';
import { logError } from '../../../utils/api';
import { KanbanArkTypeCanManageKanban } from '../types';
import { ArkErrors } from 'arktype';

export const CanFetchTasks = async (req: Request, res: Response, next: NextFunction) => {
    const props = req.body.goalId ? req.body : req.params;

    const data = KanbanArkTypeCanManageKanban(props);

    if (data instanceof ArkErrors) {
        return res.status(400).send(data.summary);
    }

    const permissions = await req.appUser.permissionsFetcher
        .getPermissionsForType(data.goalId, GoalPermissionsFetcher.PERMISSION_TYPE_FOR_GOAL)
        .catch(logError);


    if (!permissions) {
        $logger.error('Can not get permissions for CanAddTask middleware');
        return res.status(500).end();
    }

    if (permissions.hasPermissions(GoalPermissions.COMPONENT_CAN_WATCH_CONTENT)) {
        return next();
    }

    return res.status(403).end();
};
