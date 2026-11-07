import type { NextFunction, Request, Response } from 'express';
import { GoalPermissions } from '../../../types/auth.types';
import type { IntegrationAccessTarget } from '../types';
import { resolveProjectId } from './resolveProjectId';

export const CanManageIntegrations = (target: IntegrationAccessTarget) =>
    async (req: Request, res: Response, next: NextFunction) => {
        const projectId = await resolveProjectId({ req, target });
        if (!projectId) {
            return res.status(400).end();
        }

        const checker = await req.appUser.permissionsFetcher.getCheckerForGoal(projectId);
        if (checker.hasPermissions(GoalPermissions.INTEGRATIONS_CAN_MANAGE)) {
            return next();
        }

        return res.status(403).end();
    };
