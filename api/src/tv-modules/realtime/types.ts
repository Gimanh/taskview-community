export const REALTIME_TASKS_CHANGED_EVENT = 'tasks.changed';

export type RealtimeTaskChangeKind = 'created' | 'updated' | 'deleted';

export type RealtimeTasksChangedArgs = {
    goalId: number;
    taskIds: number[];
    kind: RealtimeTaskChangeKind;
};

export const REALTIME_TAGS_CHANGED_EVENT = 'tags.changed';

export type RealtimeTagsChangedArgs = {
    goalId: number;
};
