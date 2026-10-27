import type { NextFunction, Request, Response } from 'express';
import { $logger } from '../../../modules/logget';
import { GoalPermissions } from '../../../types/auth.types';

export const CanAddCollaborationRoles = async (req: Request, res: Response, next: NextFunction) => {
    const goalId = req.body.goalId;

    if (!goalId) {
        return res.status(400).end();
    }

    const goal = await req.appUser.goalsManager.goalsRepository.fetchGoalById(+goalId);

    if (!goal) {
        $logger.error('Can not get goal for CanAddCollaborationRoles middleware');
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
