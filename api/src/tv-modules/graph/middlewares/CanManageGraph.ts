import type { NextFunction, Request, Response } from 'express';
import { GoalPermissions } from '../../../types/auth.types';
import { resolveGoalId } from './resolveGoalId';

export const CanManageGraph = async (req: Request, res: Response, next: NextFunction) => {
    const goalId = await resolveGoalId(req);
    if (!goalId) {
        return res.status(400).end();
    }

    const checker = await req.appUser.permissionsFetcher.getCheckerForGoal(goalId);
    if (checker.hasPermissions(GoalPermissions.GRAPH_CAN_MANAGE)) {
        return next();
    }

    return res.status(403).end();
};
