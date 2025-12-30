import { defineStore } from 'pinia';
import type { GoalItem, KanbanArgDeleteColumn, KanbanArgUpdateColumn, KanbanArgUpdateTasksOrder, KanbanColumnItem, Task, TaskArgAdd } from 'taskview-api';
import { DEFAULT_ID } from '@/types/app.types';
import type { KanbanStoreState } from '@/types/kanban.types';
import { useTasksStore } from './tasks.store';
import { $tvApi } from '@/plugins/axios';
import type { KanbanArgAddColumn } from 'taskview-api';

const tasksStore = useTasksStore();

export const useKanbanStore = defineStore('kanban', {
    state(): KanbanStoreState {
        return {
            tasksData: {},
            statuses: [],
            goalId: DEFAULT_ID,
        };
    },
    actions: {
        async fetchTasksForColumn(goalId: GoalItem['id'], columnId: KanbanColumnItem['id'] | null, cursor: string | number | null) {
            const result = await $tvApi.kanban.fetchTasksForColumn(goalId, columnId, cursor).catch(console.error);

            if (!result) {
                if (!this.tasksData[columnId ?? DEFAULT_ID]) {
                    this.tasksData[columnId ?? DEFAULT_ID] = {
                        tasks: [],
                        nextCursor: null,
                        columnVersion: null,
                    };
                }
                return;
            }

            if (!this.tasksData[columnId ?? DEFAULT_ID]) {
                this.tasksData[columnId ?? DEFAULT_ID] = {
                    tasks: [],
                    nextCursor: null,
                    columnVersion: null,
                };
            }

            this.tasksData[columnId ?? DEFAULT_ID]!.tasks.push(...result.tasks);
            this.tasksData[columnId ?? DEFAULT_ID]!.nextCursor = result.nextCursor;
            this.tasksData[columnId ?? DEFAULT_ID]!.columnVersion = result.columnVersion;
        },

        // async fetchTasksOrderForColumnAndCursor(goalId: GoalItem['id'], columnId: Task['statusId'], cursor: string | number | null) {
        //     const result = await $tvApi.kanban.getTasksOrderForColumnAndCursor(goalId, columnId, cursor).catch(console.error);
        //     if (!result) {
        //         return;
        //     }

        //     result.forEach((task) => {
        //         const localTask = this.tasksData[columnId ?? DEFAULT_ID]?.tasks.find((t) => t.id === task.id);
        //         if (!localTask) return;
        //         localTask.kanbanOrder = task.kanbanOrder;
        //     });
        // },

        async updateTasksOrderAndColumn(data: KanbanArgUpdateTasksOrder) {
            const result = await $tvApi.kanban.updateTasksOrderAndColumn(data).catch(console.error);

            if (!result) {
                return;
            }

            result.tasks.forEach((task) => {
                const localTask = this.tasksData[data.columnId ?? DEFAULT_ID]?.tasks.find((t) => t.id === task.id);
                if (!localTask) return;
                localTask.kanbanOrder = task.kanbanOrder;
            });

            // if the column version is different, fetch the tasks again
            if (this.tasksData[data.columnId ?? DEFAULT_ID]!.columnVersion !== result.columnVersion) {
                this.tasksData[data.columnId ?? DEFAULT_ID]!.tasks = [];
                this.tasksData[data.columnId ?? DEFAULT_ID]!.nextCursor = null;
                this.tasksData[data.columnId ?? DEFAULT_ID]!.columnVersion = null;
                await this.fetchTasksForColumn(this.goalId, data.columnId ?? null, null);
            }

            this.tasksData[data.columnId ?? DEFAULT_ID]!.columnVersion = result.columnVersion;
        },

        async addTask(taskArg: TaskArgAdd) {
            const result = await $tvApi.tasks.createTask(taskArg).catch(console.error);

            if (!result) {
                return;
            }

            this.tasksData[taskArg.statusId ?? DEFAULT_ID]?.tasks.unshift(result);
        },

        async fetchStatuses(goalId: GoalItem['id']) {
            const result = await $tvApi.kanban.fetchAllColumns(goalId);
            if (!result) {
                return;
            }
            this.statuses = result;
            this.statuses.unshift({
                id: DEFAULT_ID,
                name: 'msg.allTasks',
                goalId: this.goalId,
                viewOrder: 0,
            });
        },

        async addStatus(data: KanbanArgAddColumn) {
            const result = await $tvApi.kanban.addColumn(data);
            if (!result) {
                return;
            }
            this.statuses.push(result);

            this.tasksData[result.id] = {
                tasks: [],
                nextCursor: null,
                columnVersion: null,
            };
        },

        async updateStatus(data: KanbanArgUpdateColumn) {
            const result = await $tvApi.kanban.updateColumn(data);
            if (!result) {
                return;
            }

            const index = this.statuses.findIndex((stat) => stat.id === data.id);

            if (index !== -1) {
                this.statuses[index] = { ...this.statuses[index], ...data };
            }
        },

        async deleteStatus(data: KanbanArgDeleteColumn) {
            const result = await $tvApi.kanban.deleteColumn(data);
            if (!result) {
                return;
            }
            const index = this.statuses.findIndex((stat) => stat.id === data.id);

            if (index !== -1) {
                this.statuses.splice(index, 1);
            }

            this.tasksData[data.id]?.tasks.forEach((t) => {
                if (t.statusId === data.id) {
                    t.statusId = null;
                }
            });

            delete this.tasksData[data.id];
        },
    },
});
