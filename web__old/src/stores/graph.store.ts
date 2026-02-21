import { defineStore } from 'pinia';
import type { GoalItem, GraphArgAddEdge, TaskArgUpdate } from 'taskview-api';
import { logError } from '@/helpers/app-helper';
import { $tvApi } from '@/plugins/axios';
import type { GraphStore } from '@/types/graph.types';
import type { TaskItem } from '@/types/tasks.types';
import { useGoalListsStore } from './goal-lists.store';
import { useTasksStore } from './tasks.store';

export const useGraphStore = defineStore('use-graph-store', {
    state: (): GraphStore => {
        return {
            nodes: [],
            edges: [],
        };
    },
    actions: {
        getStores() {
            return {
                tasksStore: useTasksStore(),
                goalListsStore: useGoalListsStore(),
            };
        },

        async fetchAllTasksAndLists(goalId: GoalItem['id']): Promise<void> {
            const { tasksStore, goalListsStore } = this.getStores();

            goalListsStore.currentGoalId = goalId;
            await Promise.all([
                goalListsStore.fetchLists(goalListsStore.currentGoalId),
                tasksStore.fetchAllTasks(goalListsStore.currentGoalId),
            ]);

            this.nodes = tasksStore.tasks.map((task) => ({
                id: task.id.toString(),
                data: { task, label: `${task.description} == ${task.id}` },
                position: task.nodeGraphPosition ?? { x: 0, y: 0 },
                type: 'task',
                style: { resize: 'none' },
            }));
            await this.fetchAllEdges(goalId);
        },

        async addNode(task: TaskItem) {
            this.nodes.push({
                id: task.id.toString(),
                data: { task, label: `${task.description} == ${task.id}` },
                position: task.nodeGraphPosition ?? { x: 0, y: 0 },
                type: 'task',
                style: { resize: 'none' },
            });
            return task.id.toString();
        },

        async addEdge(data: GraphArgAddEdge) {
            const result = await $tvApi.graph.addEdge(data).catch((err: unknown) => logError(err));
            if (!result) return;

            const edge = result;

            const newEdge = {
                id: edge.id.toString(),
                source: edge.fromTaskId.toString(),
                target: edge.toTaskId.toString(),
            };

            this.edges.push(newEdge);

            return newEdge;
        },

        async fetchAllEdges(goalId: number) {
            const result = await $tvApi.graph.fetchAllEdges(goalId).catch((err: unknown) => logError(err));
            if (!result) return;
            this.edges = result.map((edge) => ({
                id: edge.id.toString(),
                source: edge.fromTaskId.toString(),
                target: edge.toTaskId.toString(),
            }));
        },

        async deleteEdge(id: number) {
            const result = await $tvApi.graph.deleteEdge(id).catch((err: unknown) => logError(err));
            if (!result) return;
            const index = this.edges.findIndex((edge) => edge.id === id.toString());
            if (index !== -1) {
                this.edges.splice(index, 1);
            }
        },

        async updateTaskPosition(data: TaskArgUpdate) {
            const result = await $tvApi.tasks.updateTask(data).catch((err: unknown) => logError(err));
            if (!result) return;
        },
    },
});
