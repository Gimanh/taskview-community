import type { Request, Response } from 'express';
import {
    KanbanArkTypeFetchTasksForColumn,
    KanbanArkTypeGetTasksOrderForColumnAndCursor,
    KanbanArkTypeUpdateTasksOrder,
    KanbanSchemaAddStatus,
    KanbanSchemaFetchAllStatuses,
    KanbanSchemaStatusUpdate,
    KanbanSchemsDeleteStatus,
} from './types';
import { ArkErrors } from 'arktype';
export class KanbanController {
    fetchAllColumns = async (req: Request, res: Response) => {
        const data = KanbanSchemaFetchAllStatuses.safeParse(req.body);
        if (!data.success) {
            return res.status(400).end();
        }

        return res.tvJson((await req.appUser.kanbanManager.getAllStatusesForGoal(data.data.goalId) ?? []));
    };

    updateStatus = async (req: Request, res: Response) => {
        const data = KanbanSchemaStatusUpdate.safeParse(req.body);
        if (!data.success) {
            return res.status(400).end();
        }

        return res.tvJson(await req.appUser.kanbanManager.updateStatus(data.data));
    };

    addStatus = async (req: Request, res: Response) => {
        const data = KanbanSchemaAddStatus.safeParse(req.body);
        if (!data.success) {
            return res.status(400).end();
        }

        return res.tvJson(await req.appUser.kanbanManager.addStatus(data.data));
    };

    deleteStatus = async (req: Request, res: Response) => {
        const data = KanbanSchemsDeleteStatus.safeParse(req.body);

        if (!data.success) {
            return res.status(400).end();
        }

        return res.tvJson(await req.appUser.kanbanManager.deleteStatus(data.data));
    };

    fetchTasksForColumn = async (req: Request, res: Response) => {
        const data = KanbanArkTypeFetchTasksForColumn(req.params);
        if (data instanceof ArkErrors) {
            return res.status(400).send(data.summary);
        }

        return res.tvJson(await req.appUser.kanbanManager.fetchTasksForColumn(data));
    };


    getTasksOrderForColumnAndCursor = async (req: Request, res: Response) => {
        const data = KanbanArkTypeGetTasksOrderForColumnAndCursor(req.params);
        if (data instanceof ArkErrors) {
            return res.status(400).send(data.summary);
        }

        return res.tvJson(await req.appUser.kanbanManager.getTasksOrderForColumnAndCursor(data));
    };

    updateTasksOrderAndColumn = async (req: Request, res: Response) => {
        const data = KanbanArkTypeUpdateTasksOrder(req.body);

        if (data instanceof ArkErrors) {
            return res.status(400).send(data.summary);
        }

        return res.tvJson(await req.appUser.kanbanManager.updateTasksOrderAndColumn(data));
    };
}
