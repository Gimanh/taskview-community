import { type } from 'arktype';
import type { NextFunction, Request, Response } from 'express';
import { TaskArkTypeAdd } from '../tasks.server.types';
import { GoalPermissionsFetcher } from '../../../core/GoalPermissionsFetcher';
import { GoalPermissions } from '../../../types/auth.types';

export const CanAddTaskNew = async (req: Request, res: Response, next: NextFunction) => {
    const output = TaskArkTypeAdd(req.body);

    if (output instanceof type.errors) {
        return res.status(400).send(output.summary);
    }

    const permissionsFetcher = new GoalPermissionsFetcher(req.appUser);

    const checker = await permissionsFetcher.getCheckerForGoal(output.goalId);


    if (output.parentId && !checker.hasPermissions(GoalPermissions.TASKS_CAN_ADD_SUBTASKS)) {
        return res.status(403).send('You are not allowed to add subtasks to this task');
    }


    if (!checker.hasPermissions(GoalPermissions.COMPONENT_CAN_ADD_TASKS)) {
        return res.status(403).send('You are not allowed to add tasks to this list');
    }

    return next();
};
