import { type } from 'arktype';
import type { Request, Response } from 'express';
import { UpdateGoalListArchiveSchema, UpdateGoalListSchema } from '../../types/goal-list.types';
import { logError } from '../../utils/api';
import { GoalListArkTypeAdd, GoalListArkTypeDelete, GoalListArkTypeFetch, GoalListArkTypeUpdate } from './list.types';

export default class GoalListController {
    /**
     * @deprecated use fetchListsNew instead
     * @param req
     * @param res
     * @returns
     */
    fetchLists = async (req: Request, res: Response) => {
        const goalId = req.query.goalId;
        if (!goalId) {
            return res.status(400).end();
        }
        return res.tvJson(await req.appUser.goalListManager.fetchLists(Number(goalId)).catch(logError));
    };
    fetchListsNew = async (req: Request, res: Response) => {
        const data = GoalListArkTypeFetch(req.params);
        if (data instanceof type.errors) {
            return res.status(400).send(data.summary);
        }
        return res.tvJson(await req.appUser.goalListManager.fetchListsNew(data).catch(logError));
    };

    /**
     * @deprecated use addListNew instead
     */
    addList = async (req: Request, res: Response) => {
        const goalId = req.body.goalId;
        const listName = req.body.name;

        if (!goalId || !listName) {
            return res.status(400).end();
        }

        const addResult = await req.appUser.goalListManager.addList(listName, goalId, req.appUser);

        if (!addResult) {
            return res.tvJson({ add: false, component: false });
        }

        return res.tvJson({ add: true, component: addResult });
    };

    addListNew = async (req: Request, res: Response) => {
        const data = GoalListArkTypeAdd(req.body);

        if (data instanceof type.errors) {
            return res.status(400).send(data.summary);
        }

        const lists = await req.appUser.goalListManager.addListNew(data);

        return res.tvJson(lists[0] ?? null);
    };

    /**
     * @deprecated use deleteListNew instead
     */
    deleteList = async (req: Request, res: Response) => {
        const listId = req.body.listId;

        if (!listId) {
            return res.status(400).end();
        }

        return res.tvJson({ delete: await req.appUser.goalListManager.deleteList(listId) });
    };

    deleteListNew = async (req: Request, res: Response) => {
        const data = GoalListArkTypeDelete(req.body);

        if (data instanceof type.errors) {
            return res.status(400).send(data.summary);
        }

        return res.tvJson(!!(await req.appUser.goalListManager.deleteListNew(data)));
    };

    /**
     * @deprecated use updateListNew instead
     */
    updateList = async (req: Request, res: Response) => {
        const arg = UpdateGoalListSchema.safeParse(req.body);

        if (!arg.success) {
            return res.status(400).end();
        }

        const updateResult = await req.appUser.goalListManager.updateList(arg.data.id, arg.data.name);

        if (!updateResult) {
            return res.tvJson({ update: false, component: false });
        }

        return res.tvJson({ update: true, component: updateResult });
    };

    updateListNew = async (req: Request, res: Response) => {
        const data = GoalListArkTypeUpdate(req.body);

        if (data instanceof type.errors) {
            return res.status(400).send(data.summary);
        }

        const lists = await req.appUser.goalListManager.updateListNew(data);

        return res.tvJson(lists[0] ?? null);
    };

    /** @deprecated use updateListNew instead */
    updateArchive = async (req: Request, res: Response) => {
        const arg = UpdateGoalListArchiveSchema.safeParse(req.body);

        if (!arg.success) {
            return res.status(400).end();
        }

        const updateResult = await req.appUser.goalListManager.updateArchive(
            arg.data.id ?? arg.data.goalId!,
            arg.data.archive
        );

        if (!updateResult) {
            return res.status(400).end();
        }

        return res.tvJson({ archive: arg.data.archive });
    };
}
