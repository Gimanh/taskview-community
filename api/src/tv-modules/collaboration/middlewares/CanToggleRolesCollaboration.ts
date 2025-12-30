import { type } from 'arktype';
import type { NextFunction, Request, Response } from 'express';
import { GoalPermissionsFetcher } from '../../../core/GoalPermissionsFetcher';
import { $logger } from '../../../modules/logget';
import { GoalPermissions } from '../../../types/auth.types';
import { logError } from '../../../utils/api';
import { CollaborationArkTypeToggleUserRoles } from '../collaboration.server.types';

export const CanToggleRolesCollaboration = async (req: Request, res: Response, next: NextFunction) => {
    const output = CollaborationArkTypeToggleUserRoles(req.body);

    if (output instanceof type.errors) {
        return res.status(400).send(output.summary);
    }

    const goalId = output.goalId;

    const permissions = await req.appUser.permissionsFetcher
        .getPermissionsForType(Number(goalId), GoalPermissionsFetcher.PERMISSION_TYPE_FOR_GOAL)
        .catch(logError);

    if (!permissions) {
        $logger.error('Can not get permissions for CanToggleRolesCollaboration middleware');
        return res.status(500).end();
    }

    if (permissions.hasPermissions(GoalPermissions.GOAL_CAN_MANAGE_USERS)) {
        const userExistInGoal = await req.appUser.collaborationManager.repository.userExistInGoal(
            output.userId,
            output.goalId
        );

        if (!userExistInGoal) {
            return res.status(403).send('User not found in goal');
        }

        return next();
    }

    return res.status(403).end();
};
