import { eq, and, or, isNull } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { TasksSchema, TasksAssigneeSchema, GoalsSchema, CollaborationUsersSchema, UsersSchema } from 'taskview-db-schemas';
import { getJobQueue, cancelJobBySingletonKey } from '../../../core/JobQueue';
import { Database } from '../../../modules/db';
import { $logger } from '../../../modules/logget';
import { getNotificationService } from '../NotificationService';
import { NotificationMessages } from '../NotificationMessages';
import { DeviceTokensRepository } from '../repositories/DeviceTokensRepository';
import { NotificationType, type DeadlineJobData, type TaskWithDeadline } from '../types';
import { parseUtcTime, localHourToUtc } from '../utils';

const DEADLINE_JOB = 'deadline-notification';
const DEFAULT_MORNING_HOUR = 9;

export class DeadlineScheduler {
    private readonly deviceTokensRepo = new DeviceTokensRepository();

    async schedule(task: TaskWithDeadline, initiatorId?: number): Promise<void> {
        if (!task.endDate) return;

        let startAfter: Date | undefined;

        if (task.endTime) {
            const deadline = parseUtcTime(task.endDate, task.endTime);
            if (!deadline) return;
            startAfter = deadline > new Date() ? deadline : undefined;
        } else {
            const tz = task.owner ? await this.deviceTokensRepo.getTimezoneByUserId(task.owner) : null;
            const deadlineDay = tz
                ? localHourToUtc(task.endDate, DEFAULT_MORNING_HOUR, tz)
                : new Date(`${task.endDate}T00:00:00Z`);
            startAfter = deadlineDay > new Date() ? deadlineDay : undefined;
        }

        const data: DeadlineJobData = {
            taskId: task.id,
            description: task.description ?? '',
            goalId: task.goalId,
            goalListId: task.goalListId,
            endDate: task.endDate,
            endTime: task.endTime,
            initiatorId: initiatorId ?? null,
            immediate: !startAfter,
        };

        $logger.info(`[DeadlineScheduler] Scheduling task=${task.id} at=${startAfter?.toISOString() ?? 'immediate'}`);

        await getJobQueue().send(DEADLINE_JOB, data, {
            startAfter,
            singletonKey: this.singletonKey(task.id),
        });
    }

    async cancel(taskId: number): Promise<void> {
        await cancelJobBySingletonKey(DEADLINE_JOB, this.singletonKey(taskId));
    }

    async registerWorker(): Promise<void> {
        const boss = getJobQueue();
        const db = Database.getInstance();

        await boss.createQueue(DEADLINE_JOB);

        await boss.work<DeadlineJobData>(DEADLINE_JOB, async ([job]) => {
            const { taskId, description, goalId, goalListId, endDate, endTime, initiatorId, immediate } = job.data;

            if (!taskId) return;
            $logger.info(`[DeadlineScheduler] Worker: job=${job.id} task=${taskId}`);

            const task = await db.dbDrizzle
                .select({ owner: TasksSchema.owner, endDate: TasksSchema.endDate, endTime: TasksSchema.endTime })
                .from(TasksSchema)
                .where(and(eq(TasksSchema.id, taskId), or(eq(TasksSchema.complete, false), isNull(TasksSchema.complete))));

            if (task.length === 0) {
                $logger.info(`[DeadlineScheduler] Task ${taskId}: not found or completed`);
                return;
            }

            if (task[0].endDate !== endDate || task[0].endTime !== endTime) {
                $logger.info(`[DeadlineScheduler] Task ${taskId}: stale job, deadline changed`);
                return;
            }

            const recipientIds = await this.resolveRecipients(db, taskId, goalId, task[0].owner);
            if (!recipientIds || recipientIds.length === 0) {
                $logger.info(`[DeadlineScheduler] Task ${taskId}: no recipients`);
                return;
            }

            if (immediate && initiatorId) {
                const idx = recipientIds.indexOf(initiatorId);
                if (idx !== -1) recipientIds.splice(idx, 1);
            }

            if (recipientIds.length === 0) return;

            $logger.info(`[DeadlineScheduler] Task ${taskId}: sending to [${recipientIds.join(',')}]`);

            const tz = task[0].owner ? await this.deviceTokensRepo.getTimezoneByUserId(task[0].owner) : 'UTC';
            const message = NotificationMessages.deadline(description, endDate, endTime, tz);

            await getNotificationService().notifyMany(
                recipientIds,
                NotificationType.DEADLINE,
                message,
                { goalId, goalListId },
                taskId,
            );
        });
    }

    private singletonKey(taskId: number): string {
        return `deadline-${taskId}`;
    }

    private async resolveRecipients(db: Database, taskId: number, goalId: number, taskOwner: number | null): Promise<number[] | null> {
        const authUsers = alias(UsersSchema, 'auth_users');

        try {
            const [assignees, goal] = await Promise.all([
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

            const ids = new Set<number>();
            if (taskOwner) ids.add(taskOwner);
            assignees.forEach((r) => ids.add(r.userId));
            if (goal[0]) ids.add(goal[0].owner);

            return [...ids];
        } catch (err) {
            $logger.error(err, '[DeadlineScheduler] Failed to resolve recipients');
            return null;
        }
    }
}
