import { GoalPermissions } from '../../../types/auth.types';
import type { AutomationModuleDefinition } from '../types';

export const kanbanAutomations: AutomationModuleDefinition = {
    name: 'kanban',
    events: [
        {
            name: 'task.movedToColumn',
            busEvents: ['task.updated'],
            params: [{ key: 'statusId', source: 'kanban.statuses' }],
            match: ({ busEvent, params }) => 'statusId' in busEvent.changes && busEvent.changes.statusId === params.statusId,
        },
    ],
    actions: [
        {
            name: 'change.status',
            params: [{ key: 'statusId', source: 'kanban.statuses' }],
            requiredPermissions: [GoalPermissions.KANBAN_CAN_MANAGE],
            emits: (params) => ({ module: 'kanban', event: 'task.movedToColumn', params: { statusId: params.statusId } }),
            execute: async ({ actor, task, params }) => {
                if (task.statusId === params.statusId) return 'skipped';
                const result = await actor.tasksManager.updateTask({ id: task.id, statusId: params.statusId });
                return result.ok ? 'applied' : 'failed';
            },
        },
    ],
    dataSources: {
        'kanban.statuses': {
            viewPermissions: [GoalPermissions.KANBAN_CAN_VIEW, GoalPermissions.KANBAN_CAN_MANAGE],
            load: async ({ actor, goalId }) => {
                const statuses = await actor.kanbanManager.getAllStatusesForGoal(goalId);
                return statuses.map((status) => ({ id: status.id, label: status.name }));
            },
        },
    },
};
