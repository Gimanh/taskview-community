import { type } from 'arktype';
import type { NextFunction, Request, Response } from 'express';
import { GoalPermissionsFetcher } from '../../../core/GoalPermissionsFetcher';
import { $logger } from '../../../modules/logget';
import { GoalPermissions } from '../../../types/auth.types';
import { logError } from '../../../utils/api';
import { TasksArkTypeToggleTaskUsers } from '../tasks.server.types';

export const CanUpdateTaskAssigneeNew = async (req: Request, res: Response, next: NextFunction) => {
    const args = TasksArkTypeToggleTaskUsers(req.body);

    if (args instanceof type.errors) {
        return res.status(400).send(args.summary);
    }

    const taskId = args.taskId;

    const permissions = await req.appUser.permissionsFetcher
        .getPermissionsForType(Number(taskId), GoalPermissionsFetcher.PERMISSION_TYPE_FOR_TASK)
        .catch(logError);

    if (!permissions) {
        $logger.error('Can not get permissions for CanUpdateTaskDescription');
        return res.status(500).end();
    }

    if (permissions.hasPermissions(GoalPermissions.TASKS_CAN_ASSIGN_USERS)) {
        const task = await req.appUser.tasksManager.fetchTaskById({ taskId: args.taskId });

        if (!task) {
            return res.status(404).send('Task not found');
        }

        for (const userId of args.userIds) {
            const userExistInGoal = await req.appUser.collaborationManager.repository.userExistInGoal(
                userId,
                task.goalId
            );
            if (!userExistInGoal) {
                return res.status(403).send(`User ${userId} not found in goal for collaboration`);
            }
        }
        return next();
    }

    return res.status(403).end();
};
