import type { AppUser } from '../../core/AppUser';
import { AutomationCycleDetector } from './AutomationCycleDetector';
import { AutomationPermissions } from './AutomationPermissions';
import { AutomationRuleMapper } from './AutomationRuleMapper';
import { AutomationsRepository } from './AutomationsRepository';
import { automationCatalog } from './catalog/AutomationCatalog';
import {
    AUTOMATION_RULE_NAME_MAX_LENGTH,
    AUTOMATION_RULES_PER_GOAL_LIMIT,
    type AutomationCatalogForClient,
    type AutomationCheckCycleArgs,
    type AutomationCreateRuleArgs,
    type AutomationNormalizeParamsArgs,
    type AutomationOption,
    type AutomationOptionsArgs,
    type AutomationParams,
    type AutomationResult,
    type AutomationRuleForClient,
    type AutomationRuleShape,
    type AutomationUpdateRuleArgs,
    type AutomationValidateRuleArgs,
} from './types';

export class AutomationsManager {
    private readonly user: AppUser;
    private readonly repository: AutomationsRepository;
    private readonly cycleDetector: AutomationCycleDetector;

    constructor(user: AppUser) {
        this.user = user;
        this.repository = new AutomationsRepository();
        this.cycleDetector = new AutomationCycleDetector(automationCatalog);
    }

    catalog(): AutomationCatalogForClient {
        return automationCatalog.toClient();
    }

    async options(args: AutomationOptionsArgs): Promise<AutomationResult<AutomationOption[]>> {
        const source = automationCatalog.findDataSource(args.source);
        if (!source) return { ok: false, code: 'not_found', message: 'Unknown data source' };
        const allowed = await AutomationPermissions.hasAny({ actor: this.user, goalId: args.goalId, permissions: source.viewPermissions });
        if (!allowed) return { ok: false, code: 'forbidden' };
        return { ok: true, data: await source.load({ actor: this.user, goalId: args.goalId }) };
    }

    async list(goalId: number): Promise<AutomationRuleForClient[]> {
        const rows = await this.repository.listForGoal(goalId);
        return rows.map((row) => AutomationRuleMapper.toClient(row));
    }

    async getGoalIdOfRule(ruleId: number): Promise<number | null> {
        return (await this.repository.getById(ruleId))?.goalId ?? null;
    }

    async create(args: AutomationCreateRuleArgs): Promise<AutomationResult<AutomationRuleForClient>> {
        const userId = this.user.getUserData()?.id;
        if (!userId) return { ok: false, code: 'forbidden' };

        if ((await this.repository.countForGoal(args.goalId)) >= AUTOMATION_RULES_PER_GOAL_LIMIT) {
            return { ok: false, code: 'limit_reached', message: `A project can have at most ${AUTOMATION_RULES_PER_GOAL_LIMIT} automation rules` };
        }

        const validated = await this.validateRule({
            goalId: args.goalId,
            rule: {
                id: 0,
                trigger: { module: args.input.trigger.module, event: args.input.trigger.event, params: args.input.trigger.params ?? {} },
                action: { module: args.input.action.module, action: args.input.action.action, params: args.input.action.params ?? {} },
            },
        });
        if (!validated.ok) return validated;

        const name = this.normalizeName(args.input.name);
        if (!name) return { ok: false, code: 'invalid', message: 'name is required' };

        const enabled = args.input.enabled ?? true;
        if (enabled) {
            const cycle = await this.checkCycle({ goalId: args.goalId, candidate: validated.data, candidateName: name });
            if (!cycle.ok) return cycle;
        }

        const row = await this.repository.insert({
            goalId: args.goalId,
            creatorId: userId,
            name,
            enabled,
            triggerModule: validated.data.trigger.module,
            triggerEvent: validated.data.trigger.event,
            triggerParams: validated.data.trigger.params,
            actionModule: validated.data.action.module,
            actionName: validated.data.action.action,
            actionParams: validated.data.action.params,
        });
        if (!row) return { ok: false, code: 'invalid', message: 'Can not save the rule' };
        return { ok: true, data: AutomationRuleMapper.toClient(row) };
    }

    async update(args: AutomationUpdateRuleArgs): Promise<AutomationResult<AutomationRuleForClient>> {
        const userId = this.user.getUserData()?.id;
        if (!userId) return { ok: false, code: 'forbidden' };

        const current = await this.repository.getById(args.ruleId);
        if (!current) return { ok: false, code: 'not_found' };

        const { patch } = args;
        const name = patch.name !== undefined ? this.normalizeName(patch.name) : undefined;
        const enabled = patch.enabled ?? current.enabled;
        if (name === '') return { ok: false, code: 'invalid', message: 'name is required' };

        const changesDefinition = patch.trigger !== undefined || patch.action !== undefined;
        const enabling = patch.enabled === true && !current.enabled;

        if (!changesDefinition && !enabling) {
            const row = await this.repository.update({ ruleId: args.ruleId, patch: { name, enabled: patch.enabled } });
            if (!row) return { ok: false, code: 'not_found' };
                return { ok: true, data: AutomationRuleMapper.toClient(row) };
        }

        const currentShape = AutomationRuleMapper.toShape(current);
        const validated = await this.validateRule({
            goalId: current.goalId,
            rule: {
                id: current.id,
                trigger: patch.trigger
                    ? { module: patch.trigger.module, event: patch.trigger.event, params: patch.trigger.params ?? {} }
                    : currentShape.trigger,
                action: patch.action
                    ? { module: patch.action.module, action: patch.action.action, params: patch.action.params ?? {} }
                    : currentShape.action,
            },
        });
        if (!validated.ok) return validated;

        if (enabled) {
            const cycle = await this.checkCycle({ goalId: current.goalId, candidate: validated.data, candidateName: name ?? current.name });
            if (!cycle.ok) return cycle;
        }

        const row = await this.repository.update({
            ruleId: args.ruleId,
            patch: {
                creatorId: userId,
                name,
                enabled: patch.enabled,
                triggerModule: validated.data.trigger.module,
                triggerEvent: validated.data.trigger.event,
                triggerParams: validated.data.trigger.params,
                actionModule: validated.data.action.module,
                actionName: validated.data.action.action,
                actionParams: validated.data.action.params,
            },
        });
        if (!row) return { ok: false, code: 'not_found' };
        return { ok: true, data: AutomationRuleMapper.toClient(row) };
    }

    async remove(ruleId: number): Promise<AutomationResult<true>> {
        const deleted = await this.repository.deleteById(ruleId);
        return deleted ? { ok: true, data: true } : { ok: false, code: 'not_found' };
    }

    private async validateRule(args: AutomationValidateRuleArgs): Promise<AutomationResult<AutomationRuleShape>> {
        const { rule, goalId } = args;
        const event = automationCatalog.findEvent(rule.trigger);
        if (!event) return { ok: false, code: 'invalid', message: `Unknown event ${rule.trigger.module}/${rule.trigger.event}` };

        const action = automationCatalog.findAction(rule.action);
        if (!action) return { ok: false, code: 'invalid', message: `Unknown action ${rule.action.module}/${rule.action.action}` };

        const allowed = await AutomationPermissions.hasAll({ actor: this.user, goalId, permissions: action.requiredPermissions });
        if (!allowed) return { ok: false, code: 'forbidden', message: 'You do not have the permissions this action needs' };

        const triggerParams = await this.normalizeParams({ goalId, definitions: event.params, params: rule.trigger.params });
        if (!triggerParams.ok) return triggerParams;

        const actionParams = await this.normalizeParams({ goalId, definitions: action.params, params: rule.action.params });
        if (!actionParams.ok) return actionParams;

        return {
            ok: true,
            data: {
                id: rule.id,
                trigger: { module: rule.trigger.module, event: rule.trigger.event, params: triggerParams.data },
                action: { module: rule.action.module, action: rule.action.action, params: actionParams.data },
            },
        };
    }

    private async normalizeParams(args: AutomationNormalizeParamsArgs): Promise<AutomationResult<AutomationParams>> {
        const normalized: AutomationParams = {};
        for (const definition of args.definitions) {
            const value = args.params[definition.key];
            if (value === undefined) return { ok: false, code: 'invalid', message: `${definition.key} is required` };

            const source = automationCatalog.findDataSource(definition.source);
            const options = source ? await source.load({ actor: this.user, goalId: args.goalId }) : [];
            if (!options.some((option) => option.id === value)) {
                return { ok: false, code: 'invalid', message: `${definition.key} ${value} is not available in this project` };
            }
            normalized[definition.key] = value;
        }
        return { ok: true, data: normalized };
    }

    private async checkCycle(args: AutomationCheckCycleArgs): Promise<AutomationResult<true>> {
        const rows = await this.repository.listEnabledForGoal(args.goalId);
        if (!rows) return { ok: false, code: 'invalid', message: 'Can not check the rule for cycles' };
        const rules = rows
            .filter((row) => row.id !== args.candidate.id)
            .map((row) => AutomationRuleMapper.toShape(row));
        rules.push(args.candidate);

        const cycle = this.cycleDetector.findCycle(rules);
        if (!cycle) return { ok: true, data: true };

        const names = new Map(rows.map((row) => [row.id, row.name]));
        names.set(args.candidate.id, args.candidateName);
        const path = cycle.map((rule) => names.get(rule.id)).join(' → ');
        return { ok: false, code: 'cycle', message: path };
    }

    private normalizeName(name: string): string {
        return name.trim().slice(0, AUTOMATION_RULE_NAME_MAX_LENGTH);
    }
}
