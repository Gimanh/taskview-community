import type { Request, Response } from 'express';
import { ErpRepository } from './ErpRepository';

function getOrgId(req: Request): number {
    return Number(req.params.orgId || req.query.orgId || req.body?.organizationId || 1);
}

export default class ErpController {
    private repo = new ErpRepository();

    getConfig = async (req: Request, res: Response) => {
        try {
            const orgId = getOrgId(req);
            const data = await this.repo.getConfig(orgId);
            return res.tvJson(data);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    };

    saveConfig = async (req: Request, res: Response) => {
        try {
            const orgId = getOrgId(req);
            const data = await this.repo.saveConfig(orgId, req.body);
            return res.tvJson(data);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    };

    getBudgetForGoal = async (req: Request, res: Response) => {
        try {
            const goalId = Number(req.params.goalId || req.query.goalId);
            const orgId = getOrgId(req);
            if (!goalId) return res.status(400).json({ error: 'goalId is required' });
            const data = await this.repo.getBudgetForGoal(goalId, orgId);
            return res.tvJson(data);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    };

    updateBudget = async (req: Request, res: Response) => {
        try {
            const goalId = Number(req.params.goalId);
            const data = await this.repo.updateBudget(goalId, req.body);
            return res.tvJson(data);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    };

    addTransaction = async (req: Request, res: Response) => {
        try {
            const budgetId = Number(req.params.budgetId);
            const data = await this.repo.addTransaction(budgetId, req.body);
            return res.tvJson(data);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    };

    syncFromErp = async (req: Request, res: Response) => {
        try {
            const goalId = Number(req.params.goalId);
            const result = await this.repo.syncFromErp(goalId);
            return res.tvJson(result);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    };

    getOrgOverview = async (req: Request, res: Response) => {
        try {
            const orgId = getOrgId(req);
            const data = await this.repo.getOrgBudgetOverview(orgId);
            return res.tvJson(data);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    };

    webhook = async (req: Request, res: Response) => {
        try {
            return res.tvJson({ received: true, timestamp: new Date().toISOString() });
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    };
}
