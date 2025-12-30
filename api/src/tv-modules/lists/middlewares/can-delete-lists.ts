import { type } from 'arktype';
import type { NextFunction, Request, Response } from 'express';
import { GoalPermissionsFetcher } from '../../../core/GoalPermissionsFetcher';
import { $logger } from '../../../modules/logget';
import { GoalPermissions } from '../../../types/auth.types';
import { logError } from '../../../utils/api';
import { GoalListArkTypeDelete } from '../list.types';

export const canDeleteLists = async (req: Request, res: Response, next: NextFunction) => {
    const data = GoalListArkTypeDelete(req.body);

    if (data instanceof type.errors) {
        return res.status(400).send(data.summary);
    }

    const listId = data.id;

    const permissions = await req.appUser.permissionsFetcher
        .getPermissionsForType(Number(listId), GoalPermissionsFetcher.PERMISSION_TYPE_FOR_TASKLIST)
        .catch(logError);

    if (!permissions) {
        $logger.error('Can not get permissions for canAddLists middleware');
        return res.status(500).end();
    }

    if (permissions.hasPermissions(GoalPermissions.COMPONENT_CAN_DELETE)) {
        return next();
    }

    return res.status(403).end();
};
