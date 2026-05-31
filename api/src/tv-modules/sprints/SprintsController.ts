import { type } from 'arktype';
import type { Request, Response } from 'express';
import type { SprintStatus } from 'taskview-db-schemas';
import { logError } from '../../utils/api';
import {
    SprintArkTypeClose,
    SprintArkTypeCreate,
    SprintArkTypeGoalIdParam,
    SprintArkTypeListQuery,
    SprintArkTypePlanningQuery,
    SprintArkTypeSaveRetro,
    SprintArkTypeSetCadence,
    SprintArkTypeSetTask,
    SprintArkTypeSprintIdParam,
    SprintArkTypeUpdate,
    SprintArkTypeVelocityQuery,
} from './types';
import type { SprintErrorCode, SprintResult } from './types';

const codeToStatus: Record<SprintErrorCode, number> = {
    not_found: 404,
    conflict: 409,
    invalid_state: 400,
    forbidden: 403,
};

const VALID_STATUSES: SprintStatus[] = ['draft', 'planned', 'active', 'review', 'completed'];

export default class SprintsController {
    private sendResult<T>(res: Response, result: SprintResult<T>) {
        if (result.ok) return res.tvJson(result.data);
        return res.status(codeToStatus[result.code]).send(result.message ?? result.code);
    }

    listForGoal = async (req: Request, res: Response) => {
        const data = SprintArkTypeListQuery({ ...req.params, ...req.query });
        if (data instanceof type.errors) return res.status(400).send(data.summary);

        const statuses = data.status
            ? (data.status.split(',').map((s) => s.trim()).filter((s) => VALID_STATUSES.includes(s as SprintStatus)) as SprintStatus[])
            : undefined;

        return res.tvJson(await req.appUser.sprintsManager.listSprints({ goalId: data.goalId, statuses }).catch(logError));
    };

    getOne = async (req: Request, res: Response) => {
        const data = SprintArkTypeSprintIdParam(req.params);
        if (data instanceof type.errors) return res.status(400).send(data.summary);
        return res.tvJson(await req.appUser.sprintsManager.getSprint(data.sprintId).catch(logError));
    };

    create = async (req: Request, res: Response) => {
        const data = SprintArkTypeCreate(req.body);
        if (data instanceof type.errors) return res.status(400).send(data.summary);
        return this.sendResult(res, await req.appUser.sprintsManager.createSprint(data));
    };

    update = async (req: Request, res: Response) => {
        const data = SprintArkTypeUpdate({ sprintId: Number(req.params.sprintId), ...req.body });
        if (data instanceof type.errors) return res.status(400).send(data.summary);
        return this.sendResult(res, await req.appUser.sprintsManager.updateSprint(data));
    };

    activate = async (req: Request, res: Response) => {
        const data = SprintArkTypeSprintIdParam(req.params);
        if (data instanceof type.errors) return res.status(400).send(data.summary);
        return this.sendResult(res, await req.appUser.sprintsManager.activateSprint(data.sprintId));
    };

    review = async (req: Request, res: Response) => {
        const data = SprintArkTypeSprintIdParam(req.params);
        if (data instanceof type.errors) return res.status(400).send(data.summary);
        return this.sendResult(res, await req.appUser.sprintsManager.startReview(data.sprintId));
    };

    close = async (req: Request, res: Response) => {
        const data = SprintArkTypeClose({ sprintId: Number(req.params.sprintId), ...req.body });
        if (data instanceof type.errors) return res.status(400).send(data.summary);
        return this.sendResult(res, await req.appUser.sprintsManager.closeSprint(data));
    };

    pause = async (req: Request, res: Response) => {
        const data = SprintArkTypeSprintIdParam(req.params);
        if (data instanceof type.errors) return res.status(400).send(data.summary);
        return this.sendResult(res, await req.appUser.sprintsManager.pauseSprint(data.sprintId));
    };

    resume = async (req: Request, res: Response) => {
        const data = SprintArkTypeSprintIdParam(req.params);
        if (data instanceof type.errors) return res.status(400).send(data.summary);
        return this.sendResult(res, await req.appUser.sprintsManager.resumeSprint(data.sprintId));
    };

    remove = async (req: Request, res: Response) => {
        const data = SprintArkTypeSprintIdParam(req.params);
        if (data instanceof type.errors) return res.status(400).send(data.summary);
        return this.sendResult(res, await req.appUser.sprintsManager.deleteSprint(data.sprintId));
    };

    saveRetro = async (req: Request, res: Response) => {
        const data = SprintArkTypeSaveRetro({ sprintId: Number(req.params.sprintId), ...req.body });
        if (data instanceof type.errors) return res.status(400).send(data.summary);
        return this.sendResult(res, await req.appUser.sprintsManager.saveRetro(data));
    };

    setTaskSprint = async (req: Request, res: Response) => {
        const data = SprintArkTypeSetTask({ taskId: Number(req.params.taskId), sprintId: req.body.sprintId });
        if (data instanceof type.errors) return res.status(400).send(data.summary);
        return this.sendResult(res, await req.appUser.sprintsManager.setTaskSprint(data));
    };

    burndown = async (req: Request, res: Response) => {
        const data = SprintArkTypeSprintIdParam(req.params);
        if (data instanceof type.errors) return res.status(400).send(data.summary);
        return res.tvJson(await req.appUser.sprintsManager.getBurndown(data.sprintId).catch(logError));
    };

    planning = async (req: Request, res: Response) => {
        const data = SprintArkTypePlanningQuery({ ...req.params, ...req.query });
        if (data instanceof type.errors) return res.status(400).send(data.summary);
        return res.tvJson(
            await req.appUser.sprintsManager
                .getPlanningTasks({
                    sprintId: data.sprintId,
                    scope: data.scope,
                    cursor: data.cursor ?? null,
                    limit: data.limit ?? 30,
                })
                .catch(logError)
        );
    };

    velocity = async (req: Request, res: Response) => {
        const data = SprintArkTypeVelocityQuery({ ...req.params, ...req.query });
        if (data instanceof type.errors) return res.status(400).send(data.summary);
        return res.tvJson(
            await req.appUser.sprintsManager.getVelocity({ goalId: data.goalId, lastN: data.lastN ?? 6 }).catch(logError)
        );
    };

    getCadence = async (req: Request, res: Response) => {
        const data = SprintArkTypeGoalIdParam(req.params);
        if (data instanceof type.errors) return res.status(400).send(data.summary);
        return res.tvJson(await req.appUser.sprintsManager.getCadence(data.goalId).catch(logError));
    };

    setCadence = async (req: Request, res: Response) => {
        const data = SprintArkTypeSetCadence({ goalId: Number(req.params.goalId), ...req.body });
        if (data instanceof type.errors) return res.status(400).send(data.summary);
        return this.sendResult(res, await req.appUser.sprintsManager.setCadence(data));
    };
}
