import type { AutomationCatalog } from './catalog/AutomationCatalog';
import type {
    AutomationCycleNextRulesArgs,
    AutomationCycleTriggersArgs,
    AutomationParamsCompatibleArgs,
    AutomationRuleShape,
} from './types';

type VisitState = 'new' | 'active' | 'done';

export class AutomationCycleDetector {
    private readonly catalog: AutomationCatalog;

    constructor(catalog: AutomationCatalog) {
        this.catalog = catalog;
    }

    findCycle(rules: AutomationRuleShape[]): AutomationRuleShape[] | null {
        const edges = new Map(rules.map((rule) => [rule.id, this.nextRules({ rule, rules })]));
        const state = new Map<number, VisitState>(rules.map((rule) => [rule.id, 'new']));
        const stack: AutomationRuleShape[] = [];

        const visit = (rule: AutomationRuleShape): AutomationRuleShape[] | null => {
            state.set(rule.id, 'active');
            stack.push(rule);
            for (const next of edges.get(rule.id) ?? []) {
                const nextState = state.get(next.id);
                if (nextState === 'active') return stack.slice(stack.indexOf(next));
                if (nextState === 'new') {
                    const found = visit(next);
                    if (found) return found;
                }
            }
            stack.pop();
            state.set(rule.id, 'done');
            return null;
        };

        for (const rule of rules) {
            if (state.get(rule.id) !== 'new') continue;
            const found = visit(rule);
            if (found) return found;
        }
        return null;
    }

    private nextRules(args: AutomationCycleNextRulesArgs): AutomationRuleShape[] {
        const action = this.catalog.findAction(args.rule.action);
        const emitted = action?.emits(args.rule.action.params) ?? null;
        if (!emitted) return [];
        return args.rules.filter((other) => this.triggers({ emitted, rule: other }));
    }

    private triggers(args: AutomationCycleTriggersArgs): boolean {
        const { emitted, rule } = args;
        if (emitted.module !== rule.trigger.module || emitted.event !== rule.trigger.event) return false;
        return this.paramsCompatible({ emitted: emitted.params, expected: rule.trigger.params });
    }

    private paramsCompatible(args: AutomationParamsCompatibleArgs): boolean {
        if (!args.emitted) return true;
        return Object.entries(args.expected).every(([key, value]) => args.emitted?.[key] === undefined || args.emitted[key] === value);
    }
}
