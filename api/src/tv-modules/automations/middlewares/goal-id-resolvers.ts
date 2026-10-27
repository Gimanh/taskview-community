import type { Request } from 'express';
import { AutomationsRepository } from '../AutomationsRepository';

export function goalIdFromParam(req: Request): number | null {
    const goalId = Number(req.params.goalId);
    return Number.isInteger(goalId) && goalId > 0 ? goalId : null;
}

export async function goalIdFromRule(req: Request): Promise<number | null> {
    const ruleId = Number(req.params.ruleId);
    if (!Number.isInteger(ruleId) || ruleId <= 0) return null;
    return (await new AutomationsRepository().getById(ruleId))?.goalId ?? null;
}
