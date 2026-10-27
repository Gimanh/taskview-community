import TvApiBase from './base';
import type { AppResponse } from './base.types';
import type {
    AutomationCatalog,
    AutomationOption,
    AutomationOptionsArgs,
    AutomationRule,
    AutomationRuleCreateArgs,
    AutomationRuleUpdateArgs,
} from './automations.types';

export default class TvAutomationsApi extends TvApiBase {
    protected moduleUrl = '/module/automations';

    public async getCatalog() {
        return this.request(this.$axios.get<AppResponse<AutomationCatalog>>(`${this.moduleUrl}/catalog`));
    }

    public async getOptions(args: AutomationOptionsArgs) {
        return this.request(
            this.$axios.get<AppResponse<AutomationOption[]>>(
                `${this.moduleUrl}/goal/${args.goalId}/options/${encodeURIComponent(args.source)}`
            )
        );
    }

    public async listRules(goalId: number) {
        return this.request(this.$axios.get<AppResponse<AutomationRule[]>>(`${this.moduleUrl}/goal/${goalId}/rules`));
    }

    public async createRule(args: AutomationRuleCreateArgs) {
        const { goalId, ...body } = args;
        return this.request(this.$axios.post<AppResponse<AutomationRule>>(`${this.moduleUrl}/goal/${goalId}/rules`, body));
    }

    public async updateRule(args: AutomationRuleUpdateArgs) {
        const { ruleId, ...body } = args;
        return this.request(this.$axios.patch<AppResponse<AutomationRule>>(`${this.moduleUrl}/rule/${ruleId}`, body));
    }

    public async deleteRule(ruleId: number) {
        return this.request(this.$axios.delete<AppResponse<true>>(`${this.moduleUrl}/rule/${ruleId}`));
    }
}
