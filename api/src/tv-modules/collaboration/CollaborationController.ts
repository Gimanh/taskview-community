import { type } from 'arktype';
import type { Request, Response } from 'express';
import { $logger } from '../../modules/logget';
import {
    CollaborationArkTypeAddUser,
    CollaborationArkTypeDeleteUser,
    CollaborationArkTypeFetchUsersForGoal,
    CollaborationArkTypeToggleUserRoles,
} from './collaboration.server.types';
import {
    AddUserArgScheme,
    DeleteUserArgScheme,
    FetchGoalUsersArgSchema,
    ToggleUserRolesArgScheme,
} from './collaboration.types';

export class CollaborationController {
    fetchAllUsers = async (req: Request, res: Response) => {
        const users = await req.appUser.collaborationManager.fetchAllUsers();
        return res.tvJson(users);
    };

    fetchUsersForGoals = async (req: Request, res: Response) => {
        const args = FetchGoalUsersArgSchema.safeParse(req.params);

        if (!args.success) {
            return res.status(400).end();
        }
        const users = await req.appUser.collaborationManager.fetchUsersForGoal(args.data);

        return res.tvJson(users);
    };

    toggleUserRoles = async (req: Request, res: Response) => {
        const args = ToggleUserRolesArgScheme.safeParse(req.body);

        if (!args.success) {
            $logger.error(req.body, `Can not toggle role for user`);
            return res.status(400).end();
        }

        const roles = await req.appUser.collaborationManager.toggleUserRoles(args.data);

        if (!roles) {
            return res.status(500).end();
        }

        return res.tvJson({ roles });
    };

    addUser = async (req: Request, res: Response) => {
        const args = AddUserArgScheme.safeParse(req.body);

        if (!args.success) {
            return res.status(400).end();
        }

        const user = await req.appUser.collaborationManager.addUser(args.data);
        return res.tvJson({
            add: !!user,
            user,
        });
    };

    deleteUser = async (req: Request, res: Response) => {
        const args = DeleteUserArgScheme.safeParse(req.body);

        if (!args.success) {
            return res.status(500).end();
        }

        return res.tvJson({
            delete: await req.appUser.collaborationManager.deleteUser(args.data),
        });
    };

    addUserNew = async (req: Request, res: Response) => {
        const output = CollaborationArkTypeAddUser(req.body);

        if (output instanceof type.errors) {
            return res.status(400).send(output.summary);
        }

        const user = await req.appUser.collaborationManager.addUserNew(output);

        return res.tvJson(user ?? null);
    };

    deleteUserNew = async (req: Request, res: Response) => {
        const output = CollaborationArkTypeDeleteUser(req.body);

        if (output instanceof type.errors) {
            return res.status(400).send(output.summary);
        }

        return res.tvJson(await req.appUser.collaborationManager.deleteUserNew(output));
    };

    toggleUserRolesNew = async (req: Request, res: Response) => {
        const output = CollaborationArkTypeToggleUserRoles(req.body);

        if (output instanceof type.errors) {
            return res.status(400).send(output.summary);
        }

        return res.tvJson(await req.appUser.collaborationManager.toggleUserRolesNew(output));
    };

    fetchAllUsersNew = async (req: Request, res: Response) => {
        const users = await req.appUser.collaborationManager.fetchAllUsersNew();
        return res.tvJson(users);
    };

    fetchUsersForGoalNew = async (req: Request, res: Response) => {
        const output = CollaborationArkTypeFetchUsersForGoal(req.params);

        if (output instanceof type.errors) {
            return res.status(400).send(output.summary);
        }

        const users = await req.appUser.collaborationManager.fetchUsersForGoalNew(output.goalId);
        return res.tvJson(users);
    };
}
