import type { NextFunction, Request, Response } from 'express';
import { GoalPermissions, type GoalPermissionType } from '../../../types/auth.types';

function requireProjectPermission(permission: GoalPermissionType) {
    return async (req: Request, res: Response, next: NextFunction) => {
        const goalId = Number(req.body?.goalId ?? req.query?.goalId);
        if (!goalId || Number.isNaN(goalId)) return res.status(400).end();

        const checker = await req.appUser.permissionsFetcher.getCheckerForGoal(goalId);
        if (!checker.hasPermissions(permission)) return res.status(403).end();

        res.locals.messagingGoalId = goalId;
        return next();
    };
}

export const CanManageProjectMessaging = requireProjectPermission(GoalPermissions.INTEGRATIONS_CAN_MANAGE);
export const CanViewProjectMessaging = requireProjectPermission(GoalPermissions.INTEGRATIONS_CAN_VIEW);

export function getAuthorizedGoalId(res: Response): number {
    return res.locals.messagingGoalId as number;
}
