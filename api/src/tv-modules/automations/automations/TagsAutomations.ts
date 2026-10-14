import { GoalPermissions } from '../../../types/auth.types';
import { AutomationsRepository } from '../AutomationsRepository';
import type { AutomationModuleDefinition } from '../types';

export const tagsAutomations: AutomationModuleDefinition = {
    name: 'tags',
    events: [
        {
            name: 'tag.addedToTask',
            busEvents: ['task.tagsChanged'],
            params: [{ key: 'tagId', source: 'tags.goalTags' }],
            match: ({ busEvent, params }) => busEvent.changes.added === true && busEvent.changes.tagId === params.tagId,
        },
        {
            name: 'tag.removedFromTask',
            busEvents: ['task.tagsChanged'],
            params: [{ key: 'tagId', source: 'tags.goalTags' }],
            match: ({ busEvent, params }) => busEvent.changes.added === false && busEvent.changes.tagId === params.tagId,
        },
    ],
    actions: [
        {
            name: 'add.tag',
            params: [{ key: 'tagId', source: 'tags.goalTags' }],
            requiredPermissions: [GoalPermissions.TASKS_CAN_EDIT_TAGS],
            emits: (params) => ({ module: 'tags', event: 'tag.addedToTask', params: { tagId: params.tagId } }),
            execute: async ({ actor, task, params }) => {
                const added = await actor.tagsManager.addTagToTaskIfAbsent({ tagId: params.tagId, taskId: task.id });
                if (added === null) return 'failed';
                return added ? 'applied' : 'skipped';
            },
        },
    ],
    dataSources: {
        'tags.goalTags': {
            viewPermissions: [GoalPermissions.TASKS_CAN_WATCH_TAGS, GoalPermissions.TASKS_CAN_EDIT_TAGS],
            load: async ({ goalId }) => {
                const tags = await new AutomationsRepository().fetchGoalTags(goalId);
                return tags.map((tag) => ({ id: tag.id, label: tag.name, color: tag.color }));
            },
        },
    },
};
