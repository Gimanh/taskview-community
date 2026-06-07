import { type } from 'arktype';
import type { Request, Response } from 'express';
import {
    RecurrenceArkTypeCreate,
    RecurrenceArkTypeRuleIdParam,
    RecurrenceArkTypeTaskIdParam,
    RecurrenceArkTypeUpdate,
} from './types';
import type { RecurrenceErrorCode, RecurrenceResult } from './types';

const codeToStatus: Record<RecurrenceErrorCode, number> = {
    not_found: 404,
    conflict: 409,
    invalid_state: 400,
    invalid_rule: 422,
};

export default class RecurrenceController {
    private sendResult<T>(res: Response, result: RecurrenceResult<T>) {
        if (result.ok) return res.tvJson(result.data);
        return res.status(codeToStatus[result.code]).send(result.message ?? result.code);
    }

    create = async (req: Request, res: Response) => {
        const data = RecurrenceArkTypeCreate(req.body);
        if (data instanceof type.errors) return res.status(400).send(data.summary);
        return this.sendResult(res, await req.appUser.recurrenceManager.createRule(data));
    };

    getOne = async (req: Request, res: Response) => {
        const data = RecurrenceArkTypeRuleIdParam(req.params);
        if (data instanceof type.errors) return res.status(400).send(data.summary);
        return this.sendResult(res, await req.appUser.recurrenceManager.getDetails(data.ruleId));
    };

    getForTask = async (req: Request, res: Response) => {
        const data = RecurrenceArkTypeTaskIdParam(req.params);
        if (data instanceof type.errors) return res.status(400).send(data.summary);
        return this.sendResult(res, await req.appUser.recurrenceManager.getDetailsForTask(data.taskId));
    };

    update = async (req: Request, res: Response) => {
        // Route params win over body: the ruleId authorized by the middleware must be the one operated on.
        const data = RecurrenceArkTypeUpdate({ ...req.body, ruleId: Number(req.params.ruleId) });
        if (data instanceof type.errors) return res.status(400).send(data.summary);
        return this.sendResult(res, await req.appUser.recurrenceManager.updateRule(data));
    };

    pause = async (req: Request, res: Response) => {
        const data = RecurrenceArkTypeRuleIdParam(req.params);
        if (data instanceof type.errors) return res.status(400).send(data.summary);
        return this.sendResult(res, await req.appUser.recurrenceManager.pauseRule(data.ruleId));
    };

    resume = async (req: Request, res: Response) => {
        const data = RecurrenceArkTypeRuleIdParam(req.params);
        if (data instanceof type.errors) return res.status(400).send(data.summary);
        return this.sendResult(res, await req.appUser.recurrenceManager.resumeRule(data.ruleId));
    };

    skip = async (req: Request, res: Response) => {
        const data = RecurrenceArkTypeRuleIdParam(req.params);
        if (data instanceof type.errors) return res.status(400).send(data.summary);
        return this.sendResult(res, await req.appUser.recurrenceManager.skipCurrent(data.ruleId));
    };

    remove = async (req: Request, res: Response) => {
        const data = RecurrenceArkTypeRuleIdParam(req.params);
        if (data instanceof type.errors) return res.status(400).send(data.summary);
        return this.sendResult(res, await req.appUser.recurrenceManager.deleteRule(data.ruleId));
    };
}
