import { type } from 'arktype';
import type { NextFunction, Request, Response } from 'express';
import { GoalPermissionsFetcher } from '../../../core/GoalPermissionsFetcher';
import { $logger } from '../../../modules/logget';
import { GoalPermissions } from '../../../types/auth.types';
import { logError } from '../../../utils/api';
import { TagItemArkTypeToggle } from '../tags.types';

export const CanToggleTag = async (req: Request, res: Response, next: NextFunction) => {
    const data = TagItemArkTypeToggle(req.body);

    if (data instanceof type.errors) {
        return res.status(400).send(data.summary);
    }

    const permissions = await req.appUser.permissionsFetcher
        .getPermissionsForType(Number(data.taskId), GoalPermissionsFetcher.PERMISSION_TYPE_FOR_TASK)
        .catch(logError);

    if (!permissions) {
        $logger.error('Can not get permissions for CanToggleTag middleware');
        return res.status(500).end();
    }

    if (permissions.hasPermissions(GoalPermissions.TASKS_CAN_EDIT_TAGS)) {
        return next();
    }

    return res.status(403).end();
};
