import { eq, and, or, isNull, inArray } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { TasksSchema, TasksAssigneeSchema, GoalsSchema, CollaborationUsersSchema, UsersSchema } from 'taskview-db-schemas';
import { getJobQueue, cancelJobBySingletonKey } from '../../../core/JobQueue';
import { GoalPermissionsChecker } from '../../../core/GoalPermissionsChecker';
import { GoalPermissionsRepository } from '../../../core/GoalPermissionsRepository';
import { Database } from '../../../modules/db';
import { $logger } from '../../../modules/logget';
import { GoalPermissions } from '../../../types/auth.types';
import { getNotificationService } from '../NotificationService';
import { NotificationMessages } from '../NotificationMessages';
import { DeviceTokensRepository } from '../repositories/DeviceTokensRepository';
import { NotificationType, type DeadlineJobData, type DeadlineRecipient, type TaskWithDeadline } from '../types';
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

        const organizationId = await this.resolveOrganizationId(Database.getInstance(), task.goalId);

        const data: DeadlineJobData = {
            taskId: task.id,
            description: task.description ?? '',
            goalId: task.goalId,
            goalListId: task.goalListId,
            organizationId,
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
            const { taskId, description, goalId, goalListId, organizationId, endDate, endTime, initiatorId, immediate } = job.data;

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

            let recipients = await this.resolveRecipients(db, taskId, goalId, task[0].owner);
            if (!recipients || recipients.length === 0) {
                $logger.info(`[DeadlineScheduler] Task ${taskId}: no recipients`);
                return;
            }

            if (immediate && initiatorId) {
                recipients = recipients.filter((r) => r.userId !== initiatorId);
            }

            if (recipients.length === 0) return;

            // Description rides in the notification title, but it is gated by
            // COMPONENT_CAN_WATCH_CONTENT — split recipients so those without
            // the permission get a generic title (no leak over push).
            const { canWatch, cannotWatch } = await this.splitByContentPermission(goalId, recipients);

            $logger.info(`[DeadlineScheduler] Task ${taskId}: sending to content=[${canWatch.join(',')}] generic=[${cannotWatch.join(',')}]`);

            const tz = task[0].owner ? await this.deviceTokensRepo.getTimezoneByUserId(task[0].owner) : 'UTC';
            const meta = { goalId, goalListId, organizationId: organizationId ?? null };

            if (canWatch.length > 0) {
                const message = NotificationMessages.deadline(description, endDate, endTime, tz);
                await getNotificationService().notifyMany(canWatch, NotificationType.DEADLINE, message, meta, taskId);
            }
            if (cannotWatch.length > 0) {
                const message = NotificationMessages.deadline(null, endDate, endTime, tz);
                await getNotificationService().notifyMany(cannotWatch, NotificationType.DEADLINE, message, meta, taskId);
            }
        });
    }

    private singletonKey(taskId: number): string {
        return `deadline-${taskId}`;
    }

    private async resolveOrganizationId(db: Database, goalId: number): Promise<number | null> {
        const result = await db.dbDrizzle
            .select({ organizationId: GoalsSchema.organizationId })
            .from(GoalsSchema)
            .where(eq(GoalsSchema.id, goalId))
            .limit(1);
        return result[0]?.organizationId ?? null;
    }

    private async resolveRecipients(db: Database, taskId: number, goalId: number, taskOwner: number | null): Promise<DeadlineRecipient[] | null> {
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
            for (const r of assignees) ids.add(r.userId);
            if (goal[0]) ids.add(goal[0].owner);
            if (ids.size === 0) return [];

            // Emails are needed to resolve per-recipient goal permissions (role join keys on email).
            return await db.dbDrizzle
                .select({ userId: UsersSchema.id, email: UsersSchema.email })
                .from(UsersSchema)
                .where(inArray(UsersSchema.id, [...ids]));
        } catch (err) {
            $logger.error(err, '[DeadlineScheduler] Failed to resolve recipients');
            return null;
        }
    }

    /** Partition recipients into those allowed to see task content and those who are not. */
    private async splitByContentPermission(goalId: number,recipients: DeadlineRecipient[]): Promise<{ canWatch: number[]; cannotWatch: number[] }> {
        const permissionsRepo = new GoalPermissionsRepository();
        const canWatch: number[] = [];
        const cannotWatch: number[] = [];

        await Promise.all(
            recipients.map(async (recipient) => {
                // Fail closed per-recipient: a permission-fetch error drops this
                // recipient to the generic message, never aborts the whole job.
                const permissions = await permissionsRepo
                    .fetchPermissionsForGoalByUser({ goalId, userId: recipient.userId, email: recipient.email })
                    .catch((err) => {
                        $logger.error(err, `[DeadlineScheduler] permission check failed for user=${recipient.userId}`);
                        return [];
                    });
                const checker = new GoalPermissionsChecker(permissions);
                if (checker.hasPermissions(GoalPermissions.COMPONENT_CAN_WATCH_CONTENT)) {
                    canWatch.push(recipient.userId);
                } else {
                    cannotWatch.push(recipient.userId);
                }
            }),
        );

        return { canWatch, cannotWatch };
    }
}
