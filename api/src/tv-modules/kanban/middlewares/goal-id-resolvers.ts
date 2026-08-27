import type { Request } from 'express';

export function goalIdFromParam(req: Request): number | null {
    const goalId = Number(req.params.goalId);
    return goalId && !isNaN(goalId) ? goalId : null;
}

export function goalIdFromBody(req: Request): number | null {
    const goalId = Number(req.body?.goalId);
    return goalId && !isNaN(goalId) ? goalId : null;
}

export async function goalIdFromStatusBody(req: Request): Promise<number | null> {
    const statusId = Number(req.body?.id);
    if (!statusId || isNaN(statusId)) return null;

    const status = await req.appUser.kanbanManager.repository.fetchStatus(statusId);
    return status?.goal_id ?? null;
}
