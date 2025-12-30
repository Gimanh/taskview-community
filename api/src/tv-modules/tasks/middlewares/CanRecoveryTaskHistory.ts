import { type } from 'arktype';
import type { NextFunction, Request, Response } from 'express';
import { GoalPermissionsFetcher } from '../../../core/GoalPermissionsFetcher';
import { $logger } from '../../../modules/logget';
import { GoalPermissions } from '../../../types/auth.types';
import { logError } from '../../../utils/api';
import { TaskArkTypeRestoreTaskHistory } from '../tasks.server.types';

export const CanRecoveryTaskHistory = async (req: Request, res: Response, next: NextFunction) => {
    const data = TaskArkTypeRestoreTaskHistory(req.params);

    if (data instanceof type.errors) {
        return res.status(400).send(data.summary);
    }

    const taskIdFromHistory = await req.appUser.tasksManager.repository.fetchTaskHistoryById(data.historyId);

    if (!taskIdFromHistory) {
        return res.status(404).send('Task not found');
    }

    if (taskIdFromHistory.task.id !== data.taskId) {
        return res.status(400).send('History id is incorrect for this task');
    }

    const permissions = await req.appUser.permissionsFetcher
        .getPermissionsForType(Number(data.taskId), GoalPermissionsFetcher.PERMISSION_TYPE_FOR_TASK)
        .catch(logError);

    if (!permissions) {
        $logger.error('Can not get permissions for CanAddTask middleware');
        return res.status(500).send('Can not get permissions');
    }

    if (permissions.hasPermissions(GoalPermissions.TASKS_CAN_RECOVERY_HISTORY)) {
        return next();
    }

    return res.status(403).send('Not allowed to recovery task history');
};
