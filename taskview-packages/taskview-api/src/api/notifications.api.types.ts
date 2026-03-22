export enum NotificationType {
    DEADLINE = 'deadline',
    ASSIGN = 'assign',
    MENTION = 'mention',
    COMMENT = 'comment',
    STATUS_CHANGE = 'status_change',
}

export enum NotificationChannel {
    PUSH = 'push',
    WEBSOCKET = 'websocket',
    EMAIL = 'email',
}

export interface Notification {
    id: number;
    userId: number;
    taskId: number | null;
    type: NotificationType;
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

type Minutes = string;
type IsEnabled = boolean;
export interface NotificationPreferencesSettings {
    global?: Partial<Record<NotificationType, {
        channels?: Partial<Record<NotificationChannel, IsEnabled>>;
        intervals?: Record<Minutes, IsEnabled>;
    }>>;
    projects?: Record<string, Partial<Record<NotificationType, {
        channels?: Partial<Record<NotificationChannel, IsEnabled>>;
        intervals?: Record<Minutes, IsEnabled>;
    }>>>;
}

export type NotificationResponsePreferences = {
    settings: NotificationPreferencesSettings;
};
