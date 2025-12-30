import type { NextFunction, Request, Response } from 'express';
import { GoalPermissionsFetcher } from '../../../core/GoalPermissionsFetcher';
import { $logger } from '../../../modules/logget';
import { GoalPermissions } from '../../../types/auth.types';
import { UpdateGoalListArchiveSchema } from '../../../types/goal-list.types';
import { logError } from '../../../utils/api';

export const canArchiveLists = async (req: Request, res: Response, next: NextFunction) => {
    const arg = UpdateGoalListArchiveSchema.safeParse(req.body);

    if (!arg.success) {
        return res.status(456).end();
    }

    const listId = arg.data.id ?? arg.data.goalId;

    const permissions = await req.appUser.permissionsFetcher
        .getPermissionsForType(Number(listId), GoalPermissionsFetcher.PERMISSION_TYPE_FOR_TASKLIST)
        .catch(logError);

    if (!permissions) {
        $logger.error('Can not get permissions for canUpdateLists middleware');
        return res.status(500).end();
    }

    if (permissions.hasPermissions(GoalPermissions.COMPONENT_CAN_EDIT)) {
        return next();
    }

    return res.status(403).end();
};
