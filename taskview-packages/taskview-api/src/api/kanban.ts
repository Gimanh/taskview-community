import TvApiBase from './base';
import type { AppResponse } from '@/api/base.types';
import type { KanbanArgAddColumn, KanbanArgDeleteColumn, KanbanArgUpdateColumn, KanbanArgUpdateTasksOrder, KanbanColumnItem, KanbanFilters, KanbanResponseDeleteColumn, KanbanResponseTasksForColumn, KanbanResponseTasksOrderForColumnAndCursor, KanbanResponseUpdateColumn, KanbanResponseUpdateTasksOrder } from './kanban.types';
import type { Task } from './tasks.api.types';

export default class TvKanban extends TvApiBase {
    protected moduleUrl = '/module/kanban';

    public async fetchTasksForColumn(goalId: number, columnId: number | null, cursor: string | number | null, filters?: KanbanFilters) {
        const params = new URLSearchParams();
        if (filters) {
            if (filters.listIds && filters.listIds.length > 0) {
                params.set('listIds', filters.listIds.join(','));
            }
            if (filters.assigneeIds && filters.assigneeIds.length > 0) {
                params.set('assigneeIds', filters.assigneeIds.join(','));
            }
        }
        const query = params.toString();
        const url = `${this.moduleUrl}/tasks/${goalId}/${columnId}/${cursor}${query ? `?${query}` : ''}`;
        return this.request(
            this.$axios.get<AppResponse<KanbanResponseTasksForColumn>>(url)
        );
    }

    public async fetchAllColumns(goalId: number) {
        return this.request(
            this.$axios.post<AppResponse<KanbanColumnItem[]>>(`${this.moduleUrl}/fetch-statuses`, { goalId })
        );
    }

    public async addColumn(data: KanbanArgAddColumn) {
        return this.request(
            this.$axios.post<AppResponse<KanbanColumnItem>>(`${this.moduleUrl}/add-status`, data)
        );
    }

    public async updateColumn(data: KanbanArgUpdateColumn) {
        return this.request(
            this.$axios.post<AppResponse<KanbanResponseUpdateColumn>>(`${this.moduleUrl}/update-status`, data)
        );
    }

    public async deleteColumn(data: KanbanArgDeleteColumn) {
        return this.request(
            this.$axios.post<AppResponse<KanbanResponseDeleteColumn>>(`${this.moduleUrl}/delete-status`, data)
        );
    }

    public async getTaskOrdersForColumnAndCursor(goalId: number, columnId: Task['statusId'], cursor: string | number | null) {
        return this.request(
            this.$axios.get<AppResponse<KanbanResponseTasksOrderForColumnAndCursor>>(`${this.moduleUrl}/tasks-order/${goalId}/${columnId}/${cursor}`)
        );
    }

    public async updateTasksOrderAndColumn(data: KanbanArgUpdateTasksOrder) {
        return this.request(
            this.$axios.patch<AppResponse<KanbanResponseUpdateTasksOrder>>(`${this.moduleUrl}/update-tasks-order-and-column`, data)
        );
    }
}