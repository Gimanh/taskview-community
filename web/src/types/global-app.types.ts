export type AppResponse<S> = {
    response: S;
    rid: string;
};

export type TaskDetailDisplayMode = 'slideover' | 'modal';

export type SidebarView = 'first' | 'second';

export type AppStoreState = {
    drawer: boolean;
    taskDetailDisplayMode: TaskDetailDisplayMode;
    sidebarView: SidebarView;
};
