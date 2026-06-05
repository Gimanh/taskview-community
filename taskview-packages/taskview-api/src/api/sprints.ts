import TvApiBase from './base';
import type { AppResponse } from './base.types';
import type {
    Sprint,
    SprintBurndown,
    SprintCadence,
    SprintCloseArgs,
    SprintCreateArgs,
    SprintListFilterArgs,
    SprintPlanningArgs,
    SprintPlanningPage,
    SprintSaveRetroArgs,
    SprintSetCadenceArgs,
    SprintSetTaskArgs,
    SprintUpdateArgs,
    SprintVelocityArgs,
    SprintVelocityPoint,
    SprintWithRetro,
} from './sprints.types';

export default class TvSprintApi extends TvApiBase {
    protected moduleUrl = '/module/sprints';

    public async listForGoal(args: SprintListFilterArgs) {
        const query = args.status ? `?status=${encodeURIComponent(args.status)}` : '';
        return this.request(this.$axios.get<AppResponse<Sprint[]>>(`${this.moduleUrl}/${args.goalId}${query}`));
    }

    public async getById(sprintId: number) {
        return this.request(
            this.$axios.get<AppResponse<SprintWithRetro | null>>(`${this.moduleUrl}/sprint/${sprintId}`)
        );
    }

    public async getBurndown(sprintId: number) {
        return this.request(
            this.$axios.get<AppResponse<SprintBurndown | null>>(`${this.moduleUrl}/sprint/${sprintId}/burndown`)
        );
    }

    public async getPlanningTasks(args: SprintPlanningArgs) {
        const params = new URLSearchParams();
        params.set('scope', args.scope);
        if (args.cursor != null) params.set('cursor', String(args.cursor));
        if (args.limit != null) params.set('limit', String(args.limit));
        return this.request(
            this.$axios.get<AppResponse<SprintPlanningPage>>(
                `${this.moduleUrl}/sprint/${args.sprintId}/planning?${params.toString()}`
            )
        );
    }

    public async getVelocity(args: SprintVelocityArgs) {
        const query = args.lastN ? `?lastN=${args.lastN}` : '';
        return this.request(
            this.$axios.get<AppResponse<SprintVelocityPoint[]>>(`${this.moduleUrl}/goal/${args.goalId}/velocity${query}`)
        );
    }

    public async create(args: SprintCreateArgs) {
        return this.request(this.$axios.post<AppResponse<Sprint>>(`${this.moduleUrl}`, args));
    }

    public async update(args: SprintUpdateArgs) {
        const { sprintId, ...body } = args;
        return this.request(this.$axios.patch<AppResponse<Sprint>>(`${this.moduleUrl}/sprint/${sprintId}`, body));
    }

    public async activate(sprintId: number) {
        return this.request(this.$axios.post<AppResponse<Sprint>>(`${this.moduleUrl}/sprint/${sprintId}/activate`, {}));
    }

    public async startReview(sprintId: number) {
        return this.request(this.$axios.post<AppResponse<Sprint>>(`${this.moduleUrl}/sprint/${sprintId}/review`, {}));
    }

    public async close(args: SprintCloseArgs) {
        const { sprintId, ...body } = args;
        return this.request(this.$axios.post<AppResponse<Sprint>>(`${this.moduleUrl}/sprint/${sprintId}/close`, body));
    }

    public async pause(sprintId: number) {
        return this.request(this.$axios.post<AppResponse<Sprint>>(`${this.moduleUrl}/sprint/${sprintId}/pause`, {}));
    }

    public async resume(sprintId: number) {
        return this.request(this.$axios.post<AppResponse<Sprint>>(`${this.moduleUrl}/sprint/${sprintId}/resume`, {}));
    }

    public async remove(sprintId: number) {
        return this.request(this.$axios.delete<AppResponse<boolean>>(`${this.moduleUrl}/sprint/${sprintId}`));
    }

    public async saveRetro(args: SprintSaveRetroArgs) {
        const { sprintId, ...body } = args;
        return this.request(
            this.$axios.put<AppResponse<SprintSaveRetroArgs>>(`${this.moduleUrl}/sprint/${sprintId}/retro`, body)
        );
    }

    public async setTaskSprint(args: SprintSetTaskArgs) {
        return this.request(
            this.$axios.patch<AppResponse<{ taskId: number; sprintId: number | null }>>(
                `${this.moduleUrl}/task/${args.taskId}/sprint`,
                { sprintId: args.sprintId }
            )
        );
    }

    public async getCadence(goalId: number) {
        return this.request(
            this.$axios.get<AppResponse<SprintCadence | null>>(`${this.moduleUrl}/goal/${goalId}/cadence`)
        );
    }

    public async setCadence(args: SprintSetCadenceArgs) {
        const { goalId, ...body } = args;
        return this.request(
            this.$axios.put<AppResponse<SprintCadence>>(`${this.moduleUrl}/goal/${goalId}/cadence`, body)
        );
    }
}
