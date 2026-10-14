export const REALTIME_TASKS_CHANGED_EVENT = 'tasks.changed';

export type RealtimeTaskChangeKind = 'created' | 'updated' | 'deleted';

export type RealtimeTasksChangedArgs = {
    goalId: number;
    taskIds: number[];
    kind: RealtimeTaskChangeKind;
};
