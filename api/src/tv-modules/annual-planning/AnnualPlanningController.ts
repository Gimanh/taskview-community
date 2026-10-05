import type { Request, Response } from 'express';
import { AnnualPlanningRepository } from './AnnualPlanningRepository';

function getOrgId(req: Request): number {
    return Number(req.params.orgId || req.query.orgId || req.body?.organizationId || 1);
}

function getUserId(req: Request): number {
    return req.appUser?.getUserData()?.id || 1;
}

export default class AnnualPlanningController {
    private repo = new AnnualPlanningRepository();

    listCycles = async (req: Request, res: Response) => {
        try {
            const orgId = getOrgId(req);
            const data = await this.repo.listCycles(orgId);
            return res.tvJson(data);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    };

    createCycle = async (req: Request, res: Response) => {
        try {
            const orgId = getOrgId(req);
            if (!req.body.year || !req.body.title) {
                return res.status(400).json({ error: 'year and title are required' });
            }
            const data = await this.repo.createCycle({ ...req.body, organizationId: orgId });
            return res.tvJson(data);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    };

    updateCycle = async (req: Request, res: Response) => {
        try {
            const id = Number(req.params.id);
            const data = await this.repo.updateCycle(id, req.body);
            if (!data) return res.status(404).json({ error: 'Cycle not found' });
            return res.tvJson(data);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    };

    deleteCycle = async (req: Request, res: Response) => {
        try {
            const id = Number(req.params.id);
            const success = await this.repo.deleteCycle(id);
            return res.tvJson({ success });
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    };

    listProposals = async (req: Request, res: Response) => {
        try {
            const cycleId = Number(req.params.cycleId || req.query.cycleId);
            if (!cycleId) return res.status(400).json({ error: 'cycleId is required' });
            const data = await this.repo.listProposals(cycleId);
            return res.tvJson(data);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    };

    createProposal = async (req: Request, res: Response) => {
        try {
            const orgId = getOrgId(req);
            const userId = getUserId(req);
            if (!req.body.cycleId || !req.body.title) {
                return res.status(400).json({ error: 'cycleId and title are required' });
            }
            const data = await this.repo.createProposal({
                ...req.body,
                organizationId: orgId,
                sponsorUserId: req.body.sponsorUserId || userId,
            });
            return res.tvJson(data);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    };

    updateProposal = async (req: Request, res: Response) => {
        try {
            const id = Number(req.params.id);
            const data = await this.repo.updateProposal(id, req.body);
            if (!data) return res.status(404).json({ error: 'Proposal not found' });
            return res.tvJson(data);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    };

    deleteProposal = async (req: Request, res: Response) => {
        try {
            const id = Number(req.params.id);
            const success = await this.repo.deleteProposal(id);
            return res.tvJson({ success });
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    };

    promoteToProject = async (req: Request, res: Response) => {
        try {
            const id = Number(req.params.id);
            const userId = getUserId(req);
            const result = await this.repo.promoteToProject(id, userId);
            return res.tvJson(result);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    };
}
