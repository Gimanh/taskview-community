import type { NotificationsSchemaTypeForSelect } from 'taskview-db-schemas';
import { getJobQueue } from '../../../core/JobQueue';
import type { NotificationMeta, NotificationProvider } from '../NotificationProvider';
import { NotificationEmailWorker } from '../schedulers/NotificationEmailWorker';
import { NotificationChannel, type NotificationEmailJobData } from '../types';

export class EmailProvider implements NotificationProvider {
    readonly channel = NotificationChannel.EMAIL;

    static available(): boolean {
        return !!process.env.SMTP_HOST;
    }

    async send(_userId: number, notification: NotificationsSchemaTypeForSelect, meta: NotificationMeta): Promise<void> {
        if (!EmailProvider.available()) return;

        const data: NotificationEmailJobData = {
            notificationId: notification.id,
            goalId: meta.goalId,
            goalListId: meta.goalListId,
            organizationId: meta.organizationId,
        };
        await getJobQueue().send(NotificationEmailWorker.JOB, data, NotificationEmailWorker.RETRY);
    }
}
