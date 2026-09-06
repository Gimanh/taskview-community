import type { NextFunction, Request, Response } from 'express';
import type { GoalPermissionType } from '../types/auth.types';

/**
 * Narrows what a restricted API / OAuth token may do on surfaces that are guarded
 * by an organization role or by project ownership rather than by the project RBAC
 * — organizations, SSO configuration, webhooks. Those checks never consult
 * GoalPermissionsFetcher, so without this the scope chosen when the token was
 * issued would simply not apply to them.
 *
 * It only ever removes access. Put it AFTER the role or ownership guard, so that
 * guard still has the final say on what the human behind the token may do:
 *
 *   [IsLoggedIn, IsOrgAdmin, RequireTokenPermission(GoalPermissions.ORG_CAN_MANAGE)]
 *
 * A browser session has no token permissions and passes. A token issued with an
 * empty permission list is unrestricted by design — the same meaning it carries
 * everywhere else — and also passes, which keeps existing integrations working.
 */
export const RequireTokenPermission = (permission: GoalPermissionType) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const tokenPermissions = req.appUser.getTokenPermissions();

        if (!tokenPermissions || tokenPermissions.length === 0) {
            return next();
        }

        if (tokenPermissions.includes(permission)) {
            return next();
        }

        return res.status(403).end();
    };
};
