import type { NextFunction, Request, Response } from 'express';
import { GoalPermissionsFetcher } from '../../../core/GoalPermissionsFetcher';
import { $logger } from '../../../modules/logget';
import { GoalPermissions } from '../../../types/auth.types';
import { logError } from '../../../utils/api';

export const CanDeleteTag = async (req: Request, res: Response, next: NextFunction) => {
    const tagData = await req.appUser.tagsManager.repository.fetchTagById(req.body.tagId);

    if (!tagData) {
        $logger.error('Can not fetch tag data from database');
        return res.status(400).end();
    }

    if (tagData.goal_id !== null) {
        const permissions = await req.appUser.permissionsFetcher
            .getPermissionsForType(Number(tagData.goal_id), GoalPermissionsFetcher.PERMISSION_TYPE_FOR_GOAL)
            .catch(logError);

        if (!permissions) {
            $logger.error('Can not get permissions for CanDeleteTag middleware');
            return res.status(500).end();
        }

        if (permissions.hasPermissions(GoalPermissions.TASKS_CAN_EDIT_TAGS)) {
            return next();
        }
    } else {
        if (req.appUser.getUserData()?.id === tagData.owner) {
            return next();
        }
    }

    return res.status(403).end();
};
