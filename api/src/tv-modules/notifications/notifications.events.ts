import { eventBus } from '../../core/EventBus';
import { getJobQueue } from '../../core/JobQueue';
import { NotificationsRepository } from './NotificationsRepository';
import { getCentrifugoClient } from '../../core/CentrifugoClient';
import { $logger } from '../../modules/logget';
import { Database } from '../../modules/db';
import { sql } from 'drizzle-orm';

const DEADLINE_JOB = 'deadline-notification';
const CLEANUP_JOB = 'notifications-cleanup';
const NOTIFICATIONS_RETENTION_DAYS = 1;

interface DeadlineJobData {
    taskId: number;
    description: string;
    goalId: number;
    goalListId: number | null;
    owner: number;
    endDate: string;
    endTime: string | null;
}

async function scheduleDeadlineJob(task: { id: number; description: string | null; goalId: number; goalListId: number | null; owner: number | null; endDate: string | null; endTime: string | null }) {
    if (!task.endDate) return;

    const boss = getJobQueue();
    const jobKey = `deadline-${task.id}`;
    const startAfter = new Date(task.endDate);

    if (task.endTime) {
        const [h, m] = task.endTime.split(':');
        startAfter.setHours(Number(h), Number(m), 0, 0);
    }

    const now = new Date();
    await boss.send(DEADLINE_JOB, {
        taskId: task.id,
        description: task.description,
        goalId: task.goalId,
        goalListId: task.goalListId,
        owner: task.owner,
        endDate: task.endDate,
        endTime: task.endTime,
    }, {
        startAfter: startAfter >= now ? startAfter : undefined,
        singletonKey: jobKey,
    });
    $logger.info({ taskId: task.id, startAfter }, '[Notifications] Deadline job scheduled');
}

export function registerNotificationEventHandlers() {
    const repo = new NotificationsRepository();

    // New task created with deadline
    eventBus.on('task.created', async (data) => {
        if (data.task.endDate) {
            await scheduleDeadlineJob(data.task);
        }
    });

    // Deadline changed on existing task
    eventBus.on('task.updated', async (data) => {
        const hasDeadlineChange =
            data.changes.endDate !== undefined ||
            data.changes.startDate !== undefined ||
            data.changes.endTime !== undefined ||
            data.changes.startTime !== undefined;

        if (!hasDeadlineChange) return;

        repo.deleteDeadlineNotifications(data.task.id);
        await scheduleDeadlineJob(data.task);
    });
}

export async function registerNotificationWorkers() {
    const boss = getJobQueue();
    const repo = new NotificationsRepository();
    const db = Database.getInstance();

    await boss.createQueue(DEADLINE_JOB);
    await boss.createQueue(CLEANUP_JOB);

    // Worker: process deadline notifications
    await boss.work<DeadlineJobData>(DEADLINE_JOB, async ([job]) => {
        const { taskId, description, goalId, goalListId, owner, endDate, endTime } = job.data;

        // Check if task is still active (not completed or deleted)
        const check = await db.dbDrizzle.execute<{ complete: boolean;[key: string]: unknown }>(
            sql`SELECT complete FROM tasks.tasks WHERE id = ${taskId} AND complete = false`
        );
        if (check.rows.length === 0) return;

        const title = `Deadline: ${description || 'Task'}`;
        const timeStr = endTime ? `${endDate} ${endTime}` : endDate;
        const body = `Deadline approaching: ${timeStr}`;

        const notification = await repo.create({
            userId: owner,
            taskId,
            title,
            body,
        });

        if (notification) {
            await getCentrifugoClient().publishToUser(owner, 'notification', {
                notification,
                goalId,
                goalListId,
            });
        }

        $logger.info({ taskId, userId: owner }, '[Notifications] Deadline notification sent');
    });

    // Schedule periodic cleanup of old notifications
    await boss.schedule(CLEANUP_JOB, '0 3 * * *'); // daily at 3:00 AM

    await boss.work(CLEANUP_JOB, async (_jobs) => {
        await repo.deleteOlderThanDays(NOTIFICATIONS_RETENTION_DAYS);
        $logger.info('[Notifications] Old notifications cleaned up');
    });
}
