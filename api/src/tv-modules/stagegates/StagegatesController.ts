import type { Request, Response } from 'express';
import { StagegatesRepository } from './StagegatesRepository';

export default class StagegatesController {
    private repo = new StagegatesRepository();

    list = async (req: Request, res: Response) => {
        try {
            const goalId = Number(req.params.goalId || req.query.goalId);
            if (!goalId) {
                return res.status(400).json({ error: 'goalId parameter is required' });
            }
            const data = await this.repo.listForGoal(goalId);
            return res.tvJson(data);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    };

    getOne = async (req: Request, res: Response) => {
        try {
            const id = Number(req.params.id);
            const data = await this.repo.getById(id);
            if (!data) return res.status(404).json({ error: 'Stagegate not found' });
            return res.tvJson(data);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    };

    create = async (req: Request, res: Response) => {
        try {
            const { goalId, name, description, orderIndex, gateDate, exitCriteria } = req.body;
            if (!goalId || !name) {
                return res.status(400).json({ error: 'goalId and name are required' });
            }
            const created = await this.repo.create({ goalId, name, description, orderIndex, gateDate, exitCriteria });
            return res.tvJson(created);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    };

    update = async (req: Request, res: Response) => {
        try {
            const id = Number(req.params.id);
            const updated = await this.repo.update(id, req.body);
            if (!updated) return res.status(404).json({ error: 'Stagegate not found' });
            return res.tvJson(updated);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    };

    delete = async (req: Request, res: Response) => {
        try {
            const id = Number(req.params.id);
            const success = await this.repo.delete(id);
            return res.tvJson({ success });
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    };

    getProgress = async (req: Request, res: Response) => {
        try {
            const id = Number(req.params.id);
            const progress = await this.repo.getProgress(id);
            return res.tvJson(progress);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    };

    assignTask = async (req: Request, res: Response) => {
        try {
            const id = Number(req.params.id);
            const { taskId, isMandatory } = req.body;
            const assigned = await this.repo.assignTask(id, taskId, !!isMandatory);
            return res.tvJson(assigned);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    };

    unassignTask = async (req: Request, res: Response) => {
        try {
            const id = Number(req.params.id);
            const taskId = Number(req.params.taskId);
            const success = await this.repo.unassignTask(id, taskId);
            return res.tvJson({ success });
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    };

    submitForReview = async (req: Request, res: Response) => {
        try {
            const id = Number(req.params.id);
            const updated = await this.repo.submitForReview(id);
            return res.tvJson(updated);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    };

    decideApproval = async (req: Request, res: Response) => {
        try {
            const id = Number(req.params.id);
            const userId = req.appUser?.getUserData()?.id || 1;
            const { decision, comments } = req.body;
            if (decision !== 'approved' && decision !== 'rejected') {
                return res.status(400).json({ error: 'decision must be approved or rejected' });
            }
            const updated = await this.repo.decideApproval(id, userId, decision, comments);
            return res.tvJson(updated);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    };
}
