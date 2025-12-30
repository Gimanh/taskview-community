import { type } from 'arktype';
import type { Request, Response } from 'express';
import {
    AddGoalToDbArgSchema,
    DeleteGoalDbArgSchema,
    UpdateGoalArchiveScheme,
    UpdateGoalDbArgSchema,
} from '../../types/goal.type';
import { logError } from '../../utils/api';
import { GoalsArkTypeAdd, GoalsArkTypeDelete, GoalsArkTypeUpdate } from './types';

export default class GoalsController {
    fetchGoals = async (req: Request, res: Response) => {
        const goals = await req.appUser.goalsManager.fetchGoals().catch(logError);
        return res.tvJson(goals);
    };

    addGoal = async (req: Request, res: Response) => {
        const args = AddGoalToDbArgSchema.safeParse({ ...req.body, userId: req.appUser.getUserData()?.id });
        if (!args.success) {
            return res.status(400).end();
        }

        const goal = await req.appUser.goalsManager.addGoal(args.data).catch(logError);
        return res.tvJson({ add: !!goal, goal });
    };

    updateGoal = async (req: Request, res: Response) => {
        const arg = UpdateGoalDbArgSchema.safeParse(req.body);
        if (!arg.success) {
            return res.status(400).end();
        }
        const goal = await req.appUser.goalsManager.updateGoal(req.body).catch(logError);

        if (goal) {
            return res.tvJson({ update: !!goal, goal: goal });
        }

        return res.tvJson({ update: false });
    };

    deleteGoal = async (req: Request, res: Response) => {
        const arg = DeleteGoalDbArgSchema.safeParse(req.body);

        if (!arg.success) {
            return res.status(400).end();
        }

        return res.tvJson(await req.appUser.goalsManager.deleteGoal(arg.data.goalId).catch(logError));
    };

    fetchSharedGoals = async (req: Request, res: Response) => {
        return res.tvJson(await req.appUser.goalsManager.fetchSharedGoals());
    };

    updateArchive = async (req: Request, res: Response) => {
        const arg = UpdateGoalArchiveScheme.safeParse(req.body);

        if (!arg.success) {
            return res.status(400).end();
        }

        const archiveResult = await req.appUser.goalsManager
            .updateArchive(arg.data.goalId, arg.data.archive)
            .catch(logError);

        if (!archiveResult) {
            return res.status(400).end();
        }

        return res.tvJson({ archive: arg.data.archive });
    };

    //NEW ------------------------------------------------------------------------------------------------
    createGoal = async (req: Request, res: Response) => {
        const out = GoalsArkTypeAdd(req.body);

        if (out instanceof type.errors) {
            return res.status(400).send(out.summary);
        }

        const goal = await req.appUser.goalsManager.createGoal(out).catch(logError);
        return res.tvJson(goal ?? null);
    };

    updateGoalNew = async (req: Request, res: Response) => {
        const out = GoalsArkTypeUpdate(req.body);

        if (out instanceof type.errors) {
            return res.status(400).send(out.summary);
        }

        const goal = await req.appUser.goalsManager.updateGoalNew(out).catch(logError);
        return res.tvJson(goal ?? null);
    };

    deleteGoalNew = async (req: Request, res: Response) => {
        const out = GoalsArkTypeDelete(req.body);

        if (out instanceof type.errors) {
            return res.status(400).send(out.summary);
        }

        const goal = await req.appUser.goalsManager.deleteGoalNew(out).catch(logError);
        return res.tvJson(!!goal);
    };

    fetchGoalsNew = async (req: Request, res: Response) => {
        return res.tvJson(await req.appUser.goalsManager.fetchGoalsNew());
    };
}
