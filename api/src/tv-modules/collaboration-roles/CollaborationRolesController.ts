import { type } from 'arktype';
import type { Request, Response } from 'express';
import { $logger } from '../../modules/logget';
import {
    CollaborationArkTypeAddRoleToGoal,
    CollaborationArkTypeDeleteRoleFromGoal,
    CollaborationArkTypeFetchRolesForGoalNew,
    CollaborationArkTypeFetchRoleToPermissionsForGoalNew,
    CollaborationArkTypeToggleRolePermission,
} from '../collaboration/collaboration.server.types';
import {
    AddRoleArgSchema,
    DeleteRoleArgScheme,
    FetchAllPermissionsWithRoleArgsSchene,
    FetchAllRolesForGoalArgSchema,
    type PermissionInDb,
    TogglePermissionForRoleArgsScheme,
} from './collaboration-roles.types';

export class CollaborationRolesController {
    /**
     * @deprecated use fetchAllPermissionsNew instead
     */
    fetchAllPermissions = async (req: Request, res: Response) => {
        const result = await req.appUser.collaborationRolesManager.fetchAllPermissions();

        //We need it for compatibility with mobiles
        type ExtendedPermission = Omit<PermissionInDb, 'description_locales'> & {
            description_locales: string;
        };

        return res.tvJson(
            result.map((item): ExtendedPermission => {
                return {
                    id: item.id,
                    name: item.name,
                    description: item.description,
                    permission_group: item.permission_group,
                    description_locales: JSON.stringify(item.description_locales),
                };
            })
        );
    };

    fetchAllPermissionsNew = async (req: Request, res: Response) => {
        return res.tvJson(await req.appUser.collaborationRolesManager.fetchAllPermissionsNew());
    };

    /**
     * Deprecated use addRoleToGoal instead
     * @param req
     * @param res
     * @returns
     */
    addRole = async (req: Request, res: Response) => {
        const args = AddRoleArgSchema.safeParse(req.body);
        if (!args.success) {
            return res.status(400).end();
        }
        const result = await req.appUser.collaborationRolesManager.addRole(args.data);
        return res.tvJson({ add: !!result, role: result });
    };

    addRoleToGoal = async (req: Request, res: Response) => {
        const args = CollaborationArkTypeAddRoleToGoal(req.body);

        if (args instanceof type.errors) {
            return res.status(400).send(args.summary);
        }

        const result = await req.appUser.collaborationRolesManager.addRoleNew(args);
        return res.tvJson(result || null);
    };

    deleteRole = async (req: Request, res: Response) => {
        const args = DeleteRoleArgScheme.safeParse(req.body);

        if (!args.success) {
            return res.status(400).end();
        }

        return res.tvJson({ delete: await req.appUser.collaborationRolesManager.deleRole(args.data) });
    };

    deleteRoleNew = async (req: Request, res: Response) => {
        const args = CollaborationArkTypeDeleteRoleFromGoal(req.body);

        if (args instanceof type.errors) {
            return res.status(400).send(args.summary);
        }

        return res.tvJson(await req.appUser.collaborationRolesManager.deleteRoleNew(args));
    };

    fetchRolesForGoal = async (req: Request, res: Response) => {
        const args = FetchAllRolesForGoalArgSchema.safeParse(req.params);

        if (!args.success) {
            return res.status(400).end();
        }

        return res.tvJson({ roles: await req.appUser.collaborationRolesManager.fetchRolesForGoal(args.data) });
    };

    fetchRolesForGoalNew = async (req: Request, res: Response) => {
        const args = CollaborationArkTypeFetchRolesForGoalNew(req.params);

        if (args instanceof type.errors) {
            return res.status(400).send(args.summary);
        }

        return res.tvJson(await req.appUser.collaborationRolesManager.fetchRolesForGoalNew(args.goalId));
    };

    fetchAllRolesPermissionsForGoal = async (req: Request, res: Response) => {
        const args = FetchAllPermissionsWithRoleArgsSchene.safeParse(req.body);
        if (!args.success) {
            return res.status(400).end();
        }

        const roleToPermission = await req.appUser.collaborationRolesManager.fetchAllRolesPermissionsForGoal(
            args.data.goalId
        );

        if (!roleToPermission) {
            $logger.error(`Can not fetch roleToPermission for ${args.data.goalId}`);
        }

        return res.tvJson(roleToPermission || []);
    };

    fetchRoleToPermissionsForGoalNew = async (req: Request, res: Response) => {
        const args = CollaborationArkTypeFetchRoleToPermissionsForGoalNew(req.params);

        if (args instanceof type.errors) {
            return res.status(400).send(args.summary);
        }

        return res.tvJson(await req.appUser.collaborationRolesManager.fetchRoleToPermissionsForGoalNew(args.goalId));
    };

    /**
     * @deprecated use togglePermissionsNew instead
     * @param req
     * @param res
     * @returns
     */
    togglePermissions = async (req: Request, res: Response) => {
        const args = TogglePermissionForRoleArgsScheme.safeParse(req.body);

        if (!args.success) {
            return res.status(400).end();
        }

        const result = await req.appUser.collaborationRolesManager.toggleRolePermission(args.data);

        if (result === -1) {
            return res.status(500).end();
        }

        return res.tvJson({ add: result });
    };

    togglePermissionsNew = async (req: Request, res: Response) => {
        const args = CollaborationArkTypeToggleRolePermission(req.body);

        if (args instanceof type.errors) {
            return res.status(400).send(args.summary);
        }

        const result = await req.appUser.collaborationRolesManager.toggleRolePermissionNew(args);
        return res.tvJson({ add: result });
    };
}
