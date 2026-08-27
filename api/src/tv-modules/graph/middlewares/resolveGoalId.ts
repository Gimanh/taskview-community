import type { Request } from 'express';
import { GraphRepository } from '../GraphRepository';
import { TasksRepository } from '../../tasks/TasksRepository';

/**
 * Resolves the single goal a graph request belongs to.
 *
 * The source is chosen by what the route actually carries, not by probing every
 * field in turn: a route parameter always wins, and only a request with no
 * parameters at all (addEdge) is resolved from the body. Reading the body first
 * would let a caller point the guard at a task they own while the handler acts
 * on someone else's edge.
 *
 * A graph lives inside one project, so an edge whose endpoints sit in different
 * goals is not a permission question — it is an impossible object. It resolves
 * to null and the guards reject it before any permission is considered, the same
 * invariant the tasks.check_task_graph_relation_goal trigger enforces in the DB.
 */
export async function resolveGoalId(req: Request): Promise<number | null> {
    // fetchAllEdges: GET /:goalId
    if (req.params.goalId) {
        const goalId = Number(req.params.goalId);
        return isNaN(goalId) ? null : goalId;
    }

    // fetchTaskEdges: GET /task/:taskId
    if (req.params.taskId) {
        return goalIdForTask(req.params.taskId);
    }

    // deleteEdge: DELETE /:id
    if (req.params.id) {
        const edgeId = Number(req.params.id);
        if (isNaN(edgeId)) return null;
        const graphRepo = new GraphRepository();
        const edge = await graphRepo.fetchById(edgeId);
        return edge?.goalId ?? null;
    }

    // addEdge: POST with { source, target } — both endpoints must be in one goal
    if (req.body?.source) {
        const sourceGoalId = await goalIdForTask(req.body.source);
        if (sourceGoalId === null) return null;

        const targetGoalId = await goalIdForTask(req.body.target);
        if (targetGoalId !== sourceGoalId) return null;

        return sourceGoalId;
    }

    return null;
}

async function goalIdForTask(rawTaskId: unknown): Promise<number | null> {
    const taskId = Number(rawTaskId);
    if (!taskId || isNaN(taskId)) return null;

    const tasksRepo = new TasksRepository();
    const task = await tasksRepo.fetchTaskByIdNew(taskId);
    return task?.goalId ?? null;
}
