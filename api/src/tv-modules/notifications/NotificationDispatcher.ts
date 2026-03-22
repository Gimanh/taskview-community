import { eq, and, or, isNull, inArray } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { TasksSchema, CollaborationUsersSchema, UsersSchema } from 'taskview-db-schemas';
import { eventBus, type AppEvents } from '../../core/EventBus';
import { getJobQueue } from '../../core/JobQueue';
import { Database } from '../../modules/db';
import { $logger } from '../../modules/logget';
import { getNotificationService } from './NotificationService';
import { NotificationMessages } from './NotificationMessages';
import { NotificationsRepository } from './repositories/NotificationsRepository';
import { DeviceTokensRepository } from './repositories/DeviceTokensRepository';
import { DeadlineScheduler } from './schedulers/DeadlineScheduler';
import { NotificationType } from './types';
import { parseUtcTime } from './utils';
import type { Dispatcher } from '../../core/Dispatcher';

const CLEANUP_JOB = 'notifications-cleanup';
const NOTIFICATIONS_RETENTION_DAYS = 1;

export class NotificationDispatcher implements Dispatcher {
    private readonly deadlineScheduler = new DeadlineScheduler();
    private readonly notificationsRepo = new NotificationsRepository();
    private readonly deviceTokensRepo = new DeviceTokensRepository();

    register(): void {
        eventBus.on('task.created', (data) => this.onTaskCreated(data));
        eventBus.on('task.updated', (data) => this.onTaskUpdated(data));
        eventBus.on('task.assigneesChanged', (data) => this.onAssigneesChanged(data));
        eventBus.on('task.deleted', (data) => this.onTaskDeleted(data));
    }

    async registerWorkers(): Promise<void> {
        await this.cleanupWorker();
        await this.deadlineScheduler.registerWorker();
    }

    private async cleanupWorker(): Promise<void> {
        const boss = getJobQueue();
        await boss.createQueue(CLEANUP_JOB);
        await boss.schedule(CLEANUP_JOB, '0 3 * * *');
        await boss.work(CLEANUP_JOB, async () => {
            await this.notificationsRepo.deleteOlderThanDays(NOTIFICATIONS_RETENTION_DAYS);
        });
    }

    private async onTaskCreated(data: AppEvents['task.created']): Promise<void> {
        if (data.task.endDate) {
            await this.deadlineScheduler.schedule(data.task, data.initiatorId);
        }
    }

    private async onTaskUpdated(data: AppEvents['task.updated']): Promise<void> {
        if (data.changes.complete === true) {
            this.notificationsRepo.deleteByTaskAndType(data.task.id, NotificationType.DEADLINE);
            await this.deadlineScheduler.cancel(data.task.id);
            return;
        }

        const hasDeadlineChange =
            data.changes.endDate !== undefined ||
            data.changes.endTime !== undefined;

        if (!hasDeadlineChange) return;

        $logger.info(`[NotificationDispatcher] Rescheduling deadline for task=${data.task.id}`);

        this.notificationsRepo.deleteByTaskAndType(data.task.id, NotificationType.DEADLINE);

        if (data.task.endDate) {
            await this.deadlineScheduler.schedule(data.task, data.initiatorId);
        } else {
            await this.deadlineScheduler.cancel(data.task.id);
        }
    }

    private async onAssigneesChanged(data: AppEvents['task.assigneesChanged']): Promise<void> {
        if (data.userIds.length === 0) return;

        const db = Database.getInstance();
        const task = await db.dbDrizzle
            .select()
            .from(TasksSchema)
            .where(and(eq(TasksSchema.id, data.taskId), or(eq(TasksSchema.complete, false), isNull(TasksSchema.complete))));

        if (!task[0]) return;

        const authUsers = alias(UsersSchema, 'auth_users');
        const authUserRows = await db.dbDrizzle
            .select({ userId: authUsers.id })
            .from(CollaborationUsersSchema)
            .innerJoin(authUsers, eq(CollaborationUsersSchema.email, authUsers.email))
            .where(inArray(CollaborationUsersSchema.id, data.userIds));

        const recipientIds = authUserRows
            .map((r) => r.userId)
            .filter((id) => id !== data.initiatorId);

        if (recipientIds.length === 0) return;

        await this.handleAssignNotification(data, task[0], recipientIds);
        await this.handleExpiredDeadlineNotification(data, task[0], recipientIds);
    }

    private async handleAssignNotification(
        data: AppEvents['task.assigneesChanged'],
        task: typeof TasksSchema.$inferSelect,
        recipientIds: number[],
    ): Promise<void> {
        const initiatorName = await this.resolveUserName(data.initiatorId);
        const message = NotificationMessages.assign(task.description, initiatorName);

        $logger.info(`[NotificationDispatcher] Assign notification for task=${data.taskId}, recipients=[${recipientIds.join(',')}]`);

        await getNotificationService().notifyMany(
            recipientIds,
            NotificationType.ASSIGN,
            message,
            { goalId: task.goalId, goalListId: task.goalListId },
            data.taskId,
        );
    }

    private async handleExpiredDeadlineNotification(
        data: AppEvents['task.assigneesChanged'],
        task: typeof TasksSchema.$inferSelect,
        recipientIds: number[],
    ): Promise<void> {
        if (!task.endDate) return;

        const isExpired = task.endTime
            ? (parseUtcTime(task.endDate, task.endTime) ?? new Date()) <= new Date()
            : new Date(`${task.endDate}T00:00:00Z`) <= new Date();

        if (!isExpired) return;

        const tz = task.owner ? await this.deviceTokensRepo.getTimezoneByUserId(task.owner) : 'UTC';
        const message = NotificationMessages.deadline(task.description, task.endDate, task.endTime, tz);

        $logger.info(`[NotificationDispatcher] Expired deadline notification for task=${data.taskId}, recipients=[${recipientIds.join(',')}]`);

        await getNotificationService().notifyMany(
            recipientIds,
            NotificationType.DEADLINE,
            message,
            { goalId: task.goalId, goalListId: task.goalListId },
            data.taskId,
        );
    }

    private async onTaskDeleted(data: AppEvents['task.deleted']): Promise<void> {
        this.notificationsRepo.deleteByTaskAndType(data.taskId, NotificationType.DEADLINE);
        await this.deadlineScheduler.cancel(data.taskId);
    }

    private async resolveUserName(userId: number): Promise<string> {
        const db = Database.getInstance();
        const result = await db.dbDrizzle
            .select({ login: UsersSchema.login })
            .from(UsersSchema)
            .where(eq(UsersSchema.id, userId))
            .limit(1);
        return result[0]?.login || 'Someone';
    }
}
