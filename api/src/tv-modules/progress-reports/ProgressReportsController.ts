import type { Request, Response } from 'express';
import { ProgressReportsRepository } from './ProgressReportsRepository';

function getOrgId(req: Request): number {
    return Number(req.params.orgId || req.query.orgId || req.body?.organizationId || 1);
}

function getUserId(req: Request): number {
    return req.appUser?.getUserData()?.id || 1;
}

export default class ProgressReportsController {
    private repo = new ProgressReportsRepository();

    getCadence = async (req: Request, res: Response) => {
        try {
            const goalId = Number(req.params.goalId || req.query.goalId);
            const orgId = getOrgId(req);
            if (!goalId) return res.status(400).json({ error: 'goalId is required' });
            const data = await this.repo.getCadence(goalId, orgId);
            return res.tvJson(data);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    };

    saveCadence = async (req: Request, res: Response) => {
        try {
            const goalId = Number(req.params.goalId);
            const orgId = getOrgId(req);
            const data = await this.repo.saveCadence(goalId, orgId, req.body);
            return res.tvJson(data);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    };

    listReports = async (req: Request, res: Response) => {
        try {
            const goalId = Number(req.params.goalId || req.query.goalId);
            if (!goalId) return res.status(400).json({ error: 'goalId is required' });
            const data = await this.repo.listReports(goalId);
            return res.tvJson(data);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    };

    createReport = async (req: Request, res: Response) => {
        try {
            const userId = getUserId(req);
            const { goalId, overallHealth, stagegateHealth, budgetHealth, scheduleHealth, executiveSummary } = req.body;
            if (!goalId || !executiveSummary) {
                return res.status(400).json({ error: 'goalId and executiveSummary are required' });
            }
            const data = await this.repo.createReport({
                ...req.body,
                reportedBy: userId,
            });
            return res.tvJson(data);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    };

    triggerReminder = async (req: Request, res: Response) => {
        try {
            const goalId = Number(req.params.goalId);
            const userId = getUserId(req);
            const result = await this.repo.triggerReminder(goalId, userId);
            return res.tvJson(result);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    };
}
