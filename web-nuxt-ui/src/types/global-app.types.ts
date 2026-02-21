export type AppResponse<S> = {
    response: S;
    rid: string;
};

export type TaskDetailDisplayMode = 'slideover' | 'modal';

export type AppStoreState = {
    drawer: boolean;
    taskDetailDisplayMode: TaskDetailDisplayMode;
};
