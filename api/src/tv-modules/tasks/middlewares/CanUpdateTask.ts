import { type } from 'arktype';
import type { NextFunction, Request, Response } from 'express';
import { EntryUpdatePermissionChecker } from '../../auth/EntryUpdatePermissionChecker';
import { TaskArkTypeUpdate } from '../tasks.server.types';

/**
 * Middleware to check if the user has permissions to update a task
 */
export const CanUpdateTask = async (req: Request, res: Response, next: NextFunction) => {
    const output = TaskArkTypeUpdate(req.body);

    if (output instanceof type.errors) {
        return res.status(400).send(output.summary);
    }

    const entityPermissionChecker = new EntryUpdatePermissionChecker(output, 'task', req.appUser.permissionsFetcher);

    const checkResult = await entityPermissionChecker.check();

    if (checkResult !== true) {
        return res.status(403).send(checkResult);
    }

    return next();
};
