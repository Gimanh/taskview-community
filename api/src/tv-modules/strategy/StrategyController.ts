import type { Request, Response } from 'express';
import { StrategyRepository } from './StrategyRepository';

function getOrgId(req: Request): number {
    return Number(req.params.orgId || req.query.orgId || req.body?.organizationId || 1);
}

export default class StrategyController {
    private repo = new StrategyRepository();

    // Objectives
    listObjectives = async (req: Request, res: Response) => {
        try {
            const orgId = getOrgId(req);
            const year = req.query.year ? Number(req.query.year) : undefined;
            const data = await this.repo.listObjectives(orgId, year);
            return res.tvJson(data);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    };

    createObjective = async (req: Request, res: Response) => {
        try {
            const orgId = getOrgId(req);
            if (!req.body.title) {
                return res.status(400).json({ error: 'title is required' });
            }
            const data = await this.repo.createObjective({ ...req.body, organizationId: orgId });
            return res.tvJson(data);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    };

    updateObjective = async (req: Request, res: Response) => {
        try {
            const id = Number(req.params.id);
            const data = await this.repo.updateObjective(id, req.body);
            if (!data) return res.status(404).json({ error: 'Objective not found' });
            return res.tvJson(data);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    };

    deleteObjective = async (req: Request, res: Response) => {
        try {
            const id = Number(req.params.id);
            const success = await this.repo.deleteObjective(id);
            return res.tvJson({ success });
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    };

    // Initiatives
    listInitiatives = async (req: Request, res: Response) => {
        try {
            const orgId = getOrgId(req);
            const data = await this.repo.listAllInitiatives(orgId);
            return res.tvJson(data);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    };

    createInitiative = async (req: Request, res: Response) => {
        try {
            const orgId = getOrgId(req);
            if (!req.body.objectiveId || !req.body.title) {
                return res.status(400).json({ error: 'objectiveId and title are required' });
            }
            const data = await this.repo.createInitiative({ ...req.body, organizationId: orgId });
            return res.tvJson(data);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    };

    updateInitiative = async (req: Request, res: Response) => {
        try {
            const id = Number(req.params.id);
            const data = await this.repo.updateInitiative(id, req.body);
            if (!data) return res.status(404).json({ error: 'Initiative not found' });
            return res.tvJson(data);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    };

    deleteInitiative = async (req: Request, res: Response) => {
        try {
            const id = Number(req.params.id);
            const success = await this.repo.deleteInitiative(id);
            return res.tvJson({ success });
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    };

    linkProject = async (req: Request, res: Response) => {
        try {
            const initiativeId = Number(req.params.id);
            const goalId = Number(req.body.goalId);
            if (!goalId) return res.status(400).json({ error: 'goalId is required' });
            const data = await this.repo.linkProjectToInitiative(initiativeId, goalId);
            return res.tvJson(data);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    };

    unlinkProject = async (req: Request, res: Response) => {
        try {
            const initiativeId = Number(req.params.id);
            const goalId = Number(req.params.goalId);
            const success = await this.repo.unlinkProjectFromInitiative(initiativeId, goalId);
            return res.tvJson({ success });
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    };

    // KPIs
    listKpis = async (req: Request, res: Response) => {
        try {
            const orgId = getOrgId(req);
            const objectiveId = req.query.objectiveId ? Number(req.query.objectiveId) : undefined;
            const initiativeId = req.query.initiativeId ? Number(req.query.initiativeId) : undefined;
            const goalId = req.query.goalId ? Number(req.query.goalId) : undefined;
            const data = await this.repo.listKpis(orgId, { objectiveId, initiativeId, goalId });
            return res.tvJson(data);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    };

    createKpi = async (req: Request, res: Response) => {
        try {
            const orgId = getOrgId(req);
            if (!req.body.title || req.body.targetValue === undefined) {
                return res.status(400).json({ error: 'title and targetValue are required' });
            }
            const data = await this.repo.createKpi({ ...req.body, organizationId: orgId });
            return res.tvJson(data);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    };

    updateKpi = async (req: Request, res: Response) => {
        try {
            const id = Number(req.params.id);
            const data = await this.repo.updateKpi(id, req.body);
            if (!data) return res.status(404).json({ error: 'KPI not found' });
            return res.tvJson(data);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    };

    deleteKpi = async (req: Request, res: Response) => {
        try {
            const id = Number(req.params.id);
            const success = await this.repo.deleteKpi(id);
            return res.tvJson({ success });
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    };

    // Multi-tier Dashboard
    getDashboard = async (req: Request, res: Response) => {
        try {
            const orgId = getOrgId(req);
            const data = await this.repo.getMultiTierDashboard(orgId);
            return res.tvJson(data);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    };
}
