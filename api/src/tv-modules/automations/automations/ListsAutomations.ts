import { GoalPermissions } from '../../../types/auth.types';
import type { AutomationModuleDefinition } from '../types';

export const listsAutomations: AutomationModuleDefinition = {
    name: 'lists',
    events: [
        {
            name: 'task.addedToList',
            busEvents: ['task.created', 'task.updated'],
            params: [{ key: 'goalListId', source: 'lists.goalLists' }],
            match: ({ busEvent, params }) => {
                if (busEvent.name === 'task.created') return busEvent.task.goalListId === params.goalListId;
                return 'goalListId' in busEvent.changes && busEvent.changes.goalListId === params.goalListId;
            },
        },
    ],
    actions: [
        {
            name: 'move.toList',
            params: [{ key: 'goalListId', source: 'lists.goalLists' }],
            requiredPermissions: [GoalPermissions.COMPONENT_CAN_WATCH_CONTENT],
            emits: (params) => ({ module: 'lists', event: 'task.addedToList', params: { goalListId: params.goalListId } }),
            execute: async ({ actor, task, params }) => {
                if (task.goalListId === params.goalListId) return 'skipped';
                const result = await actor.tasksManager.updateTask({ id: task.id, goalListId: params.goalListId });
                return result.ok ? 'applied' : 'failed';
            },
        },
    ],
    dataSources: {
        'lists.goalLists': {
            viewPermissions: [GoalPermissions.COMPONENT_CAN_WATCH_CONTENT],
            load: async ({ actor, goalId }) => {
                const lists = await actor.goalListManager.fetchListsNew({ goalId });
                return lists.map((list) => ({ id: list.id, label: list.name }));
            },
        },
    },
};
