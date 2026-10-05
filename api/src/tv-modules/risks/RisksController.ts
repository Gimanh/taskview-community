import type { Request, Response } from 'express';
import { RisksRepository } from './RisksRepository';

function getOrgId(req: Request): number {
    return Number(req.params.orgId || req.query.orgId || req.body?.organizationId || 1);
}

function getUserId(req: Request): number {
    return req.appUser?.getUserData()?.id || 1;
}

export default class RisksController {
    private repo = new RisksRepository();

    list = async (req: Request, res: Response) => {
        try {
            const orgId = getOrgId(req);
            const goalId = req.query.goalId ? Number(req.query.goalId) : undefined;
            const data = await this.repo.listRisks(orgId, goalId);
            return res.tvJson(data);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    };

    getOne = async (req: Request, res: Response) => {
        try {
            const id = Number(req.params.id);
            const data = await this.repo.getById(id);
            if (!data) return res.status(404).json({ error: 'Risk not found' });
            return res.tvJson(data);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    };

    create = async (req: Request, res: Response) => {
        try {
            const orgId = getOrgId(req);
            const userId = getUserId(req);
            if (!req.body.title) {
                return res.status(400).json({ error: 'title is required' });
            }
            const data = await this.repo.createRisk({
                ...req.body,
                organizationId: orgId,
                ownerUserId: req.body.ownerUserId || userId,
            });
            return res.tvJson(data);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    };

    update = async (req: Request, res: Response) => {
        try {
            const id = Number(req.params.id);
            const data = await this.repo.updateRisk(id, req.body);
            if (!data) return res.status(404).json({ error: 'Risk not found' });
            return res.tvJson(data);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    };

    delete = async (req: Request, res: Response) => {
        try {
            const id = Number(req.params.id);
            const success = await this.repo.deleteRisk(id);
            return res.tvJson({ success });
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    };

    getMatrix = async (req: Request, res: Response) => {
        try {
            const orgId = getOrgId(req);
            const goalId = req.query.goalId ? Number(req.query.goalId) : undefined;
            const data = await this.repo.getRiskMatrix(orgId, goalId);
            return res.tvJson(data);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    };
}
