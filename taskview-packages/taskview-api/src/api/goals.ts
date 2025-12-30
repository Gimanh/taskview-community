import TvApiBase from "./base";
import type { AppResponse } from "./base.types";
import type { GoalArgItemAdd, GoalArgItemUpdate, GoalResponseAdd, GoalResponseFetch, GoalResponseUpdate } from "./goals.types";

export default class TvGoalApi extends TvApiBase {
    protected moduleUrl = '/module/goals';

    public async createGoal(goal: GoalArgItemAdd) {
        return this.request(
            this.$axios.post<AppResponse<GoalResponseAdd>>(
                `${this.moduleUrl}`, goal
            )
        );
    }

    public async updateGoal(goal: GoalArgItemUpdate) {
        return this.request(
            this.$axios.patch<AppResponse<GoalResponseUpdate>>(
                `${this.moduleUrl}`, goal
            )
        );
    }

    public async deleteGoal(goalId: number) {
        return this.request(
            this.$axios.delete<AppResponse<boolean>>(
                `${this.moduleUrl}`, { data: { goalId } }
            )
        );
    }

    public async fetchGoals() {
        return this.request(
            this.$axios.get<AppResponse<GoalResponseFetch>>(
                `${this.moduleUrl}`
            )
        );
    }
}