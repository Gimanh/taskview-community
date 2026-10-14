import { $logger } from '../../modules/logget';
import { AutomationRuleMapper } from './AutomationRuleMapper';
import { AutomationsRepository } from './AutomationsRepository';
import type { AutomationCatalog } from './catalog/AutomationCatalog';
import type { AutomationOptionRemovedArgs, AutomationRuleUsesOptionArgs } from './types';

export class AutomationOptionRemovalHandler {
    private readonly catalog: AutomationCatalog;
    private readonly repository = new AutomationsRepository();

    constructor(catalog: AutomationCatalog) {
        this.catalog = catalog;
    }

    async handle(args: AutomationOptionRemovedArgs): Promise<void> {
        const rows = await this.repository.listEnabledForGoal(args.goalId);
        if (!rows) return;

        const ruleIds = rows
            .filter((row) => this.ruleUsesOption({ rule: AutomationRuleMapper.toShape(row), source: args.source, id: args.id }))
            .map((row) => row.id);

        const disabled = await this.repository.disableMany({ goalId: args.goalId, ruleIds });
        if (disabled.length > 0) {
            $logger.info(`[Automations] ${args.source}=${args.id} removed, disabled rules ${disabled.join(',')} in goal=${args.goalId}`);
        }
    }

    private ruleUsesOption(args: AutomationRuleUsesOptionArgs): boolean {
        const { rule } = args;
        const steps = [
            { definitions: this.catalog.findEvent(rule.trigger)?.params ?? [], params: rule.trigger.params },
            { definitions: this.catalog.findAction(rule.action)?.params ?? [], params: rule.action.params },
        ];
        return steps.some((step) =>
            step.definitions.some((definition) => definition.source === args.source && step.params[definition.key] === args.id)
        );
    }
}
