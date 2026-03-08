import type { Request } from 'express';
import { GraphRepository } from '../GraphRepository';
import { TasksRepository } from '../../tasks/TasksRepository';

/**
 * Resolves goalId from graph request.
 * - GET /:goalId → params.goalId
 * - POST (addEdge) → resolve via fromTaskId (body.source)
 * - DELETE /:id → resolve via edge id
 */
export async function resolveGoalId(req: Request): Promise<number | null> {
    // Direct goalId in params (fetchAllEdges)
    if (req.params.goalId) {
        const id = Number(req.params.goalId);
        return isNaN(id) ? null : id;
    }

    // addEdge: resolve goalId from task
    if (req.body?.source) {
        const taskId = Number(req.body.source);
        if (isNaN(taskId)) return null;
        const tasksRepo = new TasksRepository();
        const task = await tasksRepo.fetchTaskByIdNew(taskId);
        return task?.goalId ?? null;
    }

    // deleteEdge: resolve goalId from edge
    if (req.params.id) {
        const edgeId = Number(req.params.id);
        if (isNaN(edgeId)) return null;
        const graphRepo = new GraphRepository();
        const edge = await graphRepo.fetchById(edgeId);
        return edge?.goalId ?? null;
    }

    return null;
}
