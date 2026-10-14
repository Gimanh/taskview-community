import { GoalPermissions } from '../../../types/auth.types';
import type { AutomationModuleDefinition } from '../types';

export const tasksAutomations: AutomationModuleDefinition = {
    name: 'tasks',
    events: [
        {
            name: 'task.created',
            busEvents: ['task.created'],
            params: [],
            match: () => true,
        },
        {
            name: 'task.completed',
            busEvents: ['task.updated'],
            params: [],
            match: ({ busEvent }) => busEvent.changes.complete === true,
        },
        {
            name: 'task.reopened',
            busEvents: ['task.updated'],
            params: [],
            match: ({ busEvent }) => busEvent.changes.complete === false,
        },
    ],
    actions: [
        {
            name: 'complete',
            params: [],
            requiredPermissions: [GoalPermissions.TASKS_CAN_EDIT_STATUS],
            emits: () => ({ module: 'tasks', event: 'task.completed' }),
            execute: async ({ actor, task }) => {
                if (task.complete) return 'skipped';
                const result = await actor.tasksManager.updateTask({ id: task.id, complete: true });
                return result.ok ? 'applied' : 'failed';
            },
        },
        {
            name: 'reopen',
            params: [],
            requiredPermissions: [GoalPermissions.TASKS_CAN_EDIT_STATUS],
            emits: () => ({ module: 'tasks', event: 'task.reopened' }),
            execute: async ({ actor, task }) => {
                if (!task.complete) return 'skipped';
                const result = await actor.tasksManager.updateTask({ id: task.id, complete: false });
                return result.ok ? 'applied' : 'failed';
            },
        },
    ],
    dataSources: {},
};
