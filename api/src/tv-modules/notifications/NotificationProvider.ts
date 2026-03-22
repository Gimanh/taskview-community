import type { NotificationsSchemaTypeForSelect } from 'taskview-db-schemas';
import type { NotificationChannel } from './types';

export interface NotificationMeta {
    goalId: number;
    goalListId: number | null;
}

export interface NotificationProvider {
    readonly channel: NotificationChannel;
    send(userId: number, notification: NotificationsSchemaTypeForSelect, meta: NotificationMeta): Promise<void>;
}
