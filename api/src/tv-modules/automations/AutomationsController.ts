import { type } from 'arktype';
import type { Request, Response } from 'express';
import {
    AutomationArkTypeGoalIdParam,
    AutomationArkTypeOptionsParams,
    AutomationArkTypeRuleIdParam,
    AutomationArkTypeRuleInput,
    AutomationArkTypeRulePatch,
    type AutomationErrorCode,
    type AutomationResult,
} from './types';

const codeToStatus: Record<AutomationErrorCode, number> = {
    not_found: 404,
    forbidden: 403,
    invalid: 400,
    cycle: 409,
    limit_reached: 409,
};

export default class AutomationsController {
    private sendResult<T>(res: Response, result: AutomationResult<T>) {
        if (result.ok) return res.tvJson(result.data);
        return res.status(codeToStatus[result.code]).json({ code: result.code, message: result.message ?? null });
    }

    catalog = (req: Request, res: Response) => {
        return res.tvJson(req.appUser.automationsManager.catalog());
    };

    options = async (req: Request, res: Response) => {
        const params = AutomationArkTypeOptionsParams(req.params);
        if (params instanceof type.errors) return res.status(400).send(params.summary);
        return this.sendResult(res, await req.appUser.automationsManager.options(params));
    };

    list = async (req: Request, res: Response) => {
        const params = AutomationArkTypeGoalIdParam(req.params);
        if (params instanceof type.errors) return res.status(400).send(params.summary);
        return res.tvJson(await req.appUser.automationsManager.list(params.goalId));
    };

    create = async (req: Request, res: Response) => {
        const params = AutomationArkTypeGoalIdParam(req.params);
        if (params instanceof type.errors) return res.status(400).send(params.summary);
        const input = AutomationArkTypeRuleInput(req.body);
        if (input instanceof type.errors) return res.status(400).send(input.summary);
        return this.sendResult(res, await req.appUser.automationsManager.create({ goalId: params.goalId, input }));
    };

    update = async (req: Request, res: Response) => {
        const params = AutomationArkTypeRuleIdParam(req.params);
        if (params instanceof type.errors) return res.status(400).send(params.summary);
        const patch = AutomationArkTypeRulePatch(req.body);
        if (patch instanceof type.errors) return res.status(400).send(patch.summary);
        return this.sendResult(res, await req.appUser.automationsManager.update({ ruleId: params.ruleId, patch }));
    };

    remove = async (req: Request, res: Response) => {
        const params = AutomationArkTypeRuleIdParam(req.params);
        if (params instanceof type.errors) return res.status(400).send(params.summary);
        return this.sendResult(res, await req.appUser.automationsManager.remove(params.ruleId));
    };
}
