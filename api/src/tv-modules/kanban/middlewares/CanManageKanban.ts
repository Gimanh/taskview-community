import type { NextFunction, Request, Response } from 'express';
import { GoalPermissionsFetcher } from '../../../core/GoalPermissionsFetcher';
import { $logger } from '../../../modules/logget';
import { GoalPermissions } from '../../../types/auth.types';
import { ALL_TASKS_LIST_ID, DEFAULT_ID } from '../../../types/tasks.types';
import { logError } from '../../../utils/api';
import { KanbanArkTypeCanManageKanban } from '../types';
import { ArkErrors } from 'arktype';

export const CanManageKanban = async (req: Request, res: Response, next: NextFunction) => {
    let props = req.body.goalId ? req.body : req.params;

    switch (req.url) {
        case '/update-status':
            const result = await req.appUser.kanbanManager.repository.fetchStatus(req.body.id);
            props = {
                goalId: result?.goal_id,
            };
            break;
        case '/delete-status':
            const result2 = await req.appUser.kanbanManager.repository.fetchStatus(req.body.id);
            props = {
                goalId: result2?.goal_id,
            };
            break;
        default:
            break;
    }

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

    if (
        permissions.hasPermissions(GoalPermissions.COMPONENT_CAN_ADD_TASKS) ||
        permissions.hasPermissions(GoalPermissions.TASKS_CAN_ADD_SUBTASKS)
    ) {
        return next();
    }

    return res.status(403).end();
};
