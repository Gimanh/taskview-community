import type { Request } from 'express';
import { TasksRepository } from '../../tasks/TasksRepository';
import { FilesRepository } from '../FilesRepository';

export function goalIdFromParam(req: Request): number | null {
    return req.params.goalId != null ? Number(req.params.goalId) : null;
}

export async function goalIdFromFile(req: Request): Promise<number | null> {
    const fileId = req.params.fileId;
    if (!fileId || !/^[0-9a-f-]{36}$/i.test(fileId)) return null;
    const file = await new FilesRepository().getById(fileId);
    return file?.goalId ?? null;
}

export async function goalIdFromTask(req: Request): Promise<number | null> {
    const taskId = Number(req.params.taskId);
    if (!Number.isFinite(taskId)) return null;
    const task = await new TasksRepository().fetchTaskByIdNew(taskId);
    return task?.goalId ?? null;
}
