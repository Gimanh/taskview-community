import TvApiBase from "./base";
import type { AppResponse } from "./base.types";
import type { GoalListItemArgAdd, GoalListItemArgDelete, GoalListItemArgFetch, GoalListItemArgUpdate, GoalListItemResponseAdd, GoalListItemResponseDelete, GoalListItemResponseFetch, GoalListItemResponseUpdate } from "./goals-list.types";

export default class TvGoalListApi extends TvApiBase {
    protected moduleUrl = '/module/goal_lists';

    public async createList(list: GoalListItemArgAdd) {
        return this.request(
            this.$axios.post<AppResponse<GoalListItemResponseAdd>>(
                `${this.moduleUrl}`, list
            )
        );
    }

    public async updateList(list: GoalListItemArgUpdate) {
        return this.request(
            this.$axios.patch<AppResponse<GoalListItemResponseUpdate>>(
                `${this.moduleUrl}`, list
            )
        );
    }

    public async deleteList(listId: GoalListItemArgDelete) {
        return this.request(
            this.$axios.delete<AppResponse<GoalListItemResponseDelete>>(
                `${this.moduleUrl}`, { data: { id: listId } }
            )
        );
    }

    public async fetchLists(listData: GoalListItemArgFetch) {
        return this.request(
            this.$axios.get<AppResponse<GoalListItemResponseFetch>>(
                `${this.moduleUrl}/${listData.goalId}`
            )
        );
    }
}