import type { Request, Response } from 'express';
import { ArkErrors } from 'arktype';
import { getApiTokensManager } from './ApiTokensManager';
import { ApiTokenArkTypeCreate, ApiTokenArkTypeDelete } from './types';
import { Database } from '../../modules/db';

export class ApiTokensController {
    private get manager() { return getApiTokensManager(); }

    create = async (req: Request, res: Response) => {
        const data = ApiTokenArkTypeCreate(req.body);
        if (data instanceof ArkErrors) {
            return res.status(400).send(data.summary);
        }

        const userId = req.appUser.getUserData()?.id;
        if (!userId) return res.status(401).end();

        const result = await this.manager.create(userId, data);
        if (!result) return res.status(500).end();

        return res.tvJson(result);
    };

    delete = async (req: Request, res: Response) => {
        const data = ApiTokenArkTypeDelete(req.body);
        if (data instanceof ArkErrors) {
            return res.status(400).send(data.summary);
        }

        const userId = req.appUser.getUserData()?.id;
        if (!userId) return res.status(401).end();

        const result = await this.manager.delete(data.id, userId);
        return res.tvJson(result);
    };

    fetch = async (req: Request, res: Response) => {
        const userId = req.appUser.getUserData()?.id;
        if (!userId) return res.status(401).end();

        const result = await this.manager.fetchAll(userId);
        return res.tvJson(result);
    };

    fetchPermissions = async (_req: Request, res: Response) => {
        const db = Database.getInstance();
        const result = await db.query<{ id: number; name: string; description: string; permissionGroup: number }>(
            `SELECT id, name, description, permission_group as "permissionGroup" FROM tv_auth.permissions WHERE permission_group <> 1 ORDER BY permission_group, id`
        );
        return res.tvJson(result?.rows ?? []);
    };
}
