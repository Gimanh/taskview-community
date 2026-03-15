export interface Notification {
    id: number;
    userId: number;
    taskId: number | null;
    title: string;
    body: string | null;
    read: boolean;
    createdAt: string;
    goalId: number | null;
    goalListId: number | null;
}

export type NotificationResponseFetch = {
    notifications: Notification[];
};

export type NotificationResponseMarkRead = boolean;

export type NotificationResponseConnectionToken = {
    token: string | null;
    url: string | null;
};
