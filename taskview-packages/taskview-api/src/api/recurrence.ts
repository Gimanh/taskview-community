import TvApiBase from './base';
import type { AppResponse } from './base.types';
import type {
    RecurrenceCreateArgs,
    RecurrenceRule,
    RecurrenceRuleDetails,
    RecurrenceUpdateArgs,
} from './recurrence.types';

export default class TvRecurrenceApi extends TvApiBase {
    protected moduleUrl = '/module/recurrence';

    public async create(args: RecurrenceCreateArgs) {
        return this.request(this.$axios.post<AppResponse<RecurrenceRule>>(`${this.moduleUrl}`, args));
    }

    public async getById(ruleId: number) {
        return this.request(this.$axios.get<AppResponse<RecurrenceRuleDetails | null>>(`${this.moduleUrl}/${ruleId}`));
    }

    public async getForTask(taskId: number) {
        return this.request(
            this.$axios.get<AppResponse<RecurrenceRuleDetails | null>>(`${this.moduleUrl}/task/${taskId}`)
        );
    }

    public async update(args: RecurrenceUpdateArgs) {
        const { ruleId, ...body } = args;
        return this.request(this.$axios.patch<AppResponse<RecurrenceRule>>(`${this.moduleUrl}/${ruleId}`, body));
    }

    public async pause(ruleId: number) {
        return this.request(this.$axios.post<AppResponse<RecurrenceRule>>(`${this.moduleUrl}/${ruleId}/pause`, {}));
    }

    public async resume(ruleId: number) {
        return this.request(this.$axios.post<AppResponse<RecurrenceRule>>(`${this.moduleUrl}/${ruleId}/resume`, {}));
    }

    public async skip(ruleId: number) {
        return this.request(
            this.$axios.post<AppResponse<RecurrenceRuleDetails>>(`${this.moduleUrl}/${ruleId}/skip`, {})
        );
    }

    public async remove(ruleId: number) {
        return this.request(this.$axios.delete<AppResponse<{ deleted: true }>>(`${this.moduleUrl}/${ruleId}`));
    }
}
