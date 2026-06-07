import type { NextFunction, Request, Response } from 'express';
import { GoalPermissionsFetcher } from '../../../core/GoalPermissionsFetcher';
import { $logger } from '../../../modules/logget';
import type { GoalPermissionType } from '../../../types/auth.types';
import { logError } from '../../../utils/api';
import { RecurrenceRepository } from '../RecurrenceRepository';

type GoalIdResolver = (req: Request) => Promise<number | null> | number | null;

/** goalId for POST /module/recurrence — resolved through the task being made recurring. */
export const goalIdFromTaskBody: GoalIdResolver = async (req) => {
    const taskId = Number(req.body?.taskId);
    if (!taskId) return null;
    const task = await new RecurrenceRepository().getTaskById(taskId);
    return task?.goalId ?? null;
};

/** goalId for /module/recurrence/:ruleId routes — resolved through the rule. */
export const goalIdFromRuleParam: GoalIdResolver = async (req) => {
    const ruleId = Number(req.params?.ruleId);
    if (!ruleId) return null;
    const rule = await new RecurrenceRepository().getById(ruleId);
    return rule?.goalId ?? null;
};

/** goalId for GET /module/recurrence/task/:taskId. */
export const goalIdFromTaskParam: GoalIdResolver = async (req) => {
    const taskId = Number(req.params?.taskId);
    if (!taskId) return null;
    const task = await new RecurrenceRepository().getTaskById(taskId);
    return task?.goalId ?? null;
};

export function requireRecurrencePermission(permission: GoalPermissionType, resolveGoalId: GoalIdResolver) {
    return async (req: Request, res: Response, next: NextFunction) => {
        const goalId = await resolveGoalId(req);
        if (!goalId) return res.status(404).end();

        const permissions = await req.appUser.permissionsFetcher
            .getPermissionsForType(goalId, GoalPermissionsFetcher.PERMISSION_TYPE_FOR_GOAL)
            .catch(logError);

        if (!permissions) {
            $logger.error('Can not resolve recurrence permissions');
            return res.status(500).end();
        }

        if (permissions.hasPermissions(permission)) return next();
        return res.status(403).end();
    };
}
