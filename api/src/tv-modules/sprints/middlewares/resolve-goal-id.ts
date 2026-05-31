import type { Request } from 'express';
import { SprintsRepository } from '../SprintsRepository';

/**
 * Resolves the goalId a sprint request operates on, from (in order):
 * a goalId param/body, or a sprintId param/body (looked up to its goal).
 */
export async function resolveGoalId(req: Request): Promise<number | null> {
    const fromGoal = req.params.goalId ?? req.body?.goalId;
    if (fromGoal) return Number(fromGoal);

    const sprintId = req.params.sprintId ?? req.body?.sprintId;
    if (sprintId) {
        const sprint = await new SprintsRepository().getById(Number(sprintId));
        return sprint?.goalId ?? null;
    }
    return null;
}
