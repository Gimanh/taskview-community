import { eventBus } from '../../core/EventBus';
import { getJobQueue } from '../../core/JobQueue';
import { NotificationsRepository } from './NotificationsRepository';
import { getCentrifugoClient } from '../../core/CentrifugoClient';
import { $logger } from '../../modules/logget';
import { Database } from '../../modules/db';
import { eq, and, or, isNull } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { TasksSchema, TasksAssigneeSchema, GoalsSchema, CollaborationUsersSchema, UsersSchema } from 'taskview-db-schemas';

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
        $logger.info({ taskId: data.task.id, endDate: data.task.endDate }, '[Notifications] task.created event');
        if (data.task.endDate) {
            await scheduleDeadlineJob(data.task);
        }
    });

    // Deadline changed on existing task
    eventBus.on('task.updated', async (data) => {
        $logger.info({ taskId: data.task.id, changes: data.changes }, '[Notifications] task.updated event');
        const hasDeadlineChange =
            data.changes.endDate !== undefined ||
            data.changes.startDate !== undefined ||
            data.changes.endTime !== undefined ||
            data.changes.startTime !== undefined;

        if (!hasDeadlineChange) {
            $logger.info({ taskId: data.task.id }, '[Notifications] No deadline change, skipping');
            return;
        }

        repo.deleteDeadlineNotifications(data.task.id);
        await scheduleDeadlineJob(data.task);
    });

    // Assignees changed — reschedule deadline job so new users get notified
    eventBus.on('task.assigneesChanged', async (data) => {
        const db = Database.getInstance();
        const task = await db.dbDrizzle
            .select()
            .from(TasksSchema)
            .where(eq(TasksSchema.id, data.taskId));

        if (task[0]?.endDate) {
            await scheduleDeadlineJob(task[0]);
        }
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
        $logger.info({ jobData: job.data }, '[Notifications] Deadline worker received job');
        const { taskId, description, goalId, goalListId, endDate, endTime } = job.data;

        // Check if task is still active (not completed or deleted)
        const task = await db.dbDrizzle
            .select({ owner: TasksSchema.owner })
            .from(TasksSchema)
            .where(and(eq(TasksSchema.id, taskId), or(eq(TasksSchema.complete, false), isNull(TasksSchema.complete))));

        $logger.info({ taskId, taskResult: task }, '[Notifications] Task lookup result');
        if (task.length === 0) return;

        const taskOwner = task[0].owner;

        // Collect all recipients: task owner + assignees (resolved to auth user id) + goal owner
        let assigneesResult: { userId: number }[] = [];
        let goalResult: { owner: number }[] = [];
        const authUsers = alias(UsersSchema, 'auth_users');
        try {
        [assigneesResult, goalResult] = await Promise.all([
            db.dbDrizzle
                .select({ userId: authUsers.id })
                .from(TasksAssigneeSchema)
                .innerJoin(CollaborationUsersSchema, eq(TasksAssigneeSchema.collabUserId, CollaborationUsersSchema.id))
                .innerJoin(authUsers, eq(CollaborationUsersSchema.email, authUsers.email))
                .where(eq(TasksAssigneeSchema.taskId, taskId)),
            db.dbDrizzle
                .select({ owner: GoalsSchema.owner })
                .from(GoalsSchema)
                .where(eq(GoalsSchema.id, goalId)),
        ]);
        } catch (err) {
            $logger.error(err, '[Notifications] Failed to resolve recipients');
        }

        const recipientIds = new Set<number>();
        if (taskOwner) recipientIds.add(taskOwner);
        assigneesResult.forEach((r) => recipientIds.add(r.userId));
        if (goalResult[0]) {
            recipientIds.add(goalResult[0].owner);
        }

        $logger.info({ taskId, recipientIds: [...recipientIds], assignees: assigneesResult, goalOwner: goalResult[0]?.owner }, '[Notifications] Recipients resolved');

        const title = `Deadline: ${description || 'Task'}`;
        const timeStr = endTime ? `${endDate} ${endTime}` : endDate;
        const body = `Deadline approaching: ${timeStr}`;

        for (const userId of recipientIds) {
            const notification = await repo.create({
                userId,
                taskId,
                title,
                body,
            });

            if (notification) {
                await getCentrifugoClient().publishToUser(userId, 'notification', {
                    notification,
                    goalId,
                    goalListId,
                });
            }
        }

        $logger.info({ taskId, recipients: [...recipientIds] }, '[Notifications] Deadline notifications sent');
    });

    // Schedule periodic cleanup of old notifications
    await boss.schedule(CLEANUP_JOB, '0 3 * * *'); // daily at 3:00 AM

    await boss.work(CLEANUP_JOB, async (_jobs) => {
        await repo.deleteOlderThanDays(NOTIFICATIONS_RETENTION_DAYS);
        $logger.info('[Notifications] Old notifications cleaned up');
    });
}
