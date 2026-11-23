import { Email } from '../../../core/Email';
import { getJobQueue } from '../../../core/JobQueue';
import { $logger } from '../../../modules/logget';
import { ALL_TASKS_LIST_ID } from '../../../types/tasks.types';
import { NotificationMailTemplate } from '../NotificationMailTemplate';
import { NotificationsRepository } from '../repositories/NotificationsRepository';
import type { NotificationEmailJobData, NotificationEmailLinkArgs } from '../types';

export class NotificationEmailWorker {
    static readonly JOB = 'notification-email';
    static readonly RETRY = { retryLimit: 3, retryDelay: 60, retryBackoff: true };

    private readonly repository = new NotificationsRepository();

    async registerWorker(): Promise<void> {
        const boss = getJobQueue();
        await boss.createQueue(NotificationEmailWorker.JOB);
        await boss.work<NotificationEmailJobData>(NotificationEmailWorker.JOB, async ([job]) => {
            await this.deliver(job.data);
        });
    }

    async deliver(data: NotificationEmailJobData): Promise<void> {
        const record = await this.repository.fetchForEmail(data.notificationId);
        if (!record) {
            $logger.info(`[NotificationEmail] Notification ${data.notificationId} is gone — nothing to send`);
            return;
        }

        const content = {
            title: record.title,
            body: record.body,
            link: await this.link({ ...data, taskId: record.taskId }),
        };
        const sent = await Email.send({
            subject: NotificationMailTemplate.subject(content),
            text: NotificationMailTemplate.text(content),
            to: record.email,
            from: process.env.SMTP_FROM_EMAIL as string,
            attachment: [{ data: NotificationMailTemplate.html(content), alternative: true }],
        });
        if (!sent) {
            throw new Error(`Notification ${data.notificationId} email was not sent`);
        }
    }

    // Frontend task route is /:orgSlug/:projectId/:listId/:taskId
    private async link(args: NotificationEmailLinkArgs): Promise<string | null> {
        const appUrl = (process.env.APP_URL ?? '').replace(/\/+$/, '');
        if (!appUrl) return null;
        if (!args.organizationId) return appUrl;

        const slug = await this.repository.organizationSlug(args.organizationId);
        if (!slug) return appUrl;

        const project = `${appUrl}/${encodeURIComponent(slug)}/${args.goalId}`;
        return args.taskId ? `${project}/${args.goalListId ?? ALL_TASKS_LIST_ID}/${args.taskId}` : project;
    }
}
