import { type } from 'arktype';
import type { NextFunction, Request, Response } from 'express';
import { $logger } from '../../../modules/logget';
import { CollaborationArkTypeDeleteRoleFromGoal } from '../../collaboration/collaboration.server.types';

export const CanDeleteCollaborationRoles = async (req: Request, res: Response, next: NextFunction) => {
    const args = CollaborationArkTypeDeleteRoleFromGoal(req.body);

    if (args instanceof type.errors) {
        return res.status(400).send(args.summary);
    }

    const goalId = args.goalId;

    const goal = await req.appUser.goalsManager.goalsRepository.fetchGoalById(+goalId);

    if (!goal) {
        $logger.error('Can not get goal for CanDeleteCollaborationRoles middleware');
        return res.status(500).end();
    }

    //Only owners can manage roles itself
    if (goal.owner === req.appUser.getUserData()?.id) {
        return next();
    }

    return res.status(403).end();
};
