import type { Request } from 'express';
import { SprintsRepository } from '../SprintsRepository';

export async function goalIdFromSprint(req: Request): Promise<number | null> {
    const sprintId = req.params.sprintId;
    if (sprintId == null) return null;
    const sprint = await new SprintsRepository().getById(Number(sprintId));
    return sprint?.goalId ?? null;
}

export function goalIdFromParam(req: Request): number | null {
    return req.params.goalId != null ? Number(req.params.goalId) : null;
}

export function goalIdFromBody(req: Request): number | null {
    return req.body?.goalId != null ? Number(req.body.goalId) : null;
}
