import { type } from 'arktype';
import type { NextFunction, Request, Response } from 'express';
import { GoalPermissionsFetcher } from '../../../core/GoalPermissionsFetcher';
import { $logger } from '../../../modules/logget';
import { GoalPermissions } from '../../../types/auth.types';
import { logError } from '../../../utils/api';
import { GoalListArkTypeUpdate } from '../list.types';

export const canUpdateLists = async (req: Request, res: Response, next: NextFunction) => {
    const arg = GoalListArkTypeUpdate(req.body);

    if (arg instanceof type.errors) {
        return res.status(400).send(arg.summary);
    }

    const listId = arg.id;

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
