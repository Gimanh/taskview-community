import TvApiBase from "./base"
import type { AppResponse } from "./base.types";
import { type TaskArgAdd, type TaskResponseAdd, type TaskArgDelete, type TaskResponseDelete, type TaskArgUpdate, type TaskResponseUpdate, type TaskResponseFetchById, type TaskArgFetch, type TaskResponseFetch, type TaskArgToggleAssignee, type TaskResponseToggleAssignee, type TaskResponseFetchTaskHistory, type TaskResponseRecoveryTaskHistory } from "./tasks.api.types"

export default class TvTaskApi extends TvApiBase {
    protected moduleUrl = '/module/tasks';

    public async fetch(data: TaskArgFetch) {
        //TODO: add type for response
        return this.request(
            this.$axios.get<AppResponse<TaskResponseFetch>>(
                `${this.moduleUrl}`, { params: data }
            )
        );
    }

    public async fetchTaskById(taskId: number) {
        return this.request(
            this.$axios.get<AppResponse<TaskResponseFetchById>>(
                `${this.moduleUrl}/${taskId}`
            )
        );
    }

    public async updateTask(task: TaskArgUpdate) {
        return this.request(
            this.$axios.patch<AppResponse<TaskResponseUpdate>>(
                `${this.moduleUrl}`, task
            )
        );
    }

    public async createTask(task: TaskArgAdd) {
        return this.request(
            this.$axios.post<AppResponse<TaskResponseAdd>>(
                `${this.moduleUrl}`, task
            )
        );
    }

    public async deleteTask(taskId: TaskArgDelete) {
        return this.request(
            this.$axios.delete<AppResponse<TaskResponseDelete>>(
                `${this.moduleUrl}`, { data: { taskId } }
            )
        );
    }

    public async toggleTasksAssignee(data: TaskArgToggleAssignee) {
        return this.request(
            this.$axios.patch<AppResponse<TaskResponseToggleAssignee>>(
                `${this.moduleUrl}/task-users`, data
            )
        );
    }

    public async fetchTaskHistory(taskId: number) {
        return this.request(
            this.$axios.get<AppResponse<TaskResponseFetchTaskHistory>>(
                `${this.moduleUrl}/${taskId}/history`
            )
        );
    }

    public async recoveryTaskHistory(historyId: number, taskId: number) {
        return this.request(
            this.$axios.post<AppResponse<TaskResponseRecoveryTaskHistory>>(
                `${this.moduleUrl}/${taskId}/restore/${historyId}`
            )
        );
    }
}