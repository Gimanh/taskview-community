import type { GoalItem, KanbanColumnItem, KanbanResponseTasksForColumn } from 'taskview-api';

export type KanbanStoreState = {
    tasksData: {
        [key: KanbanColumnItem['id']]: KanbanResponseTasksForColumn | undefined;
    };
    // TODO: rename to columns
    statuses: KanbanColumnItem[];
    goalId: GoalItem['id'];
};