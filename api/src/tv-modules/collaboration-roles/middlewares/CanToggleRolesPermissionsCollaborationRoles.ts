import type { NextFunction, Request, Response } from 'express';
import { $logger } from '../../../modules/logget';
import { GoalPermissions } from '../../../types/auth.types';

export const CanToggleRolesPermissionsCollaborationRoles = async (req: Request, res: Response, next: NextFunction) => {
    const roleId = req.body.roleId;

    if (!roleId) {
        return res.status(400).end();
    }

    const role = await req.appUser.collaborationRolesManager.repository.fetchRecordById(roleId);

    
    if (!role) {
        return res.status(403).send('Role not found');
    }

    const goal = await req.appUser.goalsManager.goalsRepository.fetchGoalById(+role?.goal_id);

    if (!goal) {
        $logger.error('Can not get goal for CanToggleRolesPermissionsCollaborationRoles middleware');
        return res.status(500).end();
    }

    if (goal.owner !== req.appUser.getUserData()?.id) {
        return res.status(403).end();
    }

    const permissions = await req.appUser.permissionsFetcher.getCheckerForGoal(goal.id);
    if (permissions.hasPermissions(GoalPermissions.GOAL_CAN_MANAGE_USERS)) {
        return next();
    }

    return res.status(403).end();
};
