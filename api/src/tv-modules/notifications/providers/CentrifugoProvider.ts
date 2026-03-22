import type { NotificationsSchemaTypeForSelect } from 'taskview-db-schemas';
import { getCentrifugoClient } from '../../../core/CentrifugoClient';
import type { NotificationMeta, NotificationProvider } from '../NotificationProvider';
import { NotificationChannel } from '../types';

export class CentrifugoProvider implements NotificationProvider {
    readonly channel = NotificationChannel.WEBSOCKET;

    async send(userId: number, notification: NotificationsSchemaTypeForSelect, meta: NotificationMeta): Promise<void> {
        await getCentrifugoClient().publishToUser(userId, 'notification', {
            notification,
            goalId: meta.goalId,
            goalListId: meta.goalListId,
        });
    }
}
