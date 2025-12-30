import type { NextFunction, Request, Response } from 'express';
import { $logger } from '../../../modules/logget';

export const CanFetchRolesPermissionsCollaborationRoles = async (req: Request, res: Response, next: NextFunction) => {
    const goalId = req.body.goalId ? req.body.goalId : req.params.goalId;

    if (!goalId) {
        return res.status(400).end();
    }

    const goal = await req.appUser.goalsManager.goalsRepository.fetchGoalById(+goalId);

    if (!goal) {
        $logger.error('Can not get goal for CanFetchRolesPermissionsCollaborationRoles middleware');
        return res.status(500).end();
    }

    if (goal.owner === req.appUser.getUserData()?.id) {
        return next();
    }

    return res.status(403).end();
};
