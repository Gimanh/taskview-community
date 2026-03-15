import { and, eq, desc, lt, like, sql } from 'drizzle-orm';
import { NotificationsSchema, TasksSchema, type NotificationsSchemaTypeForSelect } from 'taskview-db-schemas';
import { Database } from '../../modules/db';
import { callWithCatch } from '../../utils/helpers';

export class NotificationsRepository {
    private readonly db: Database;

    constructor() {
        this.db = Database.getInstance();
    }

    async create(data: { userId: number; taskId: number | null; title: string; body: string | null }): Promise<NotificationsSchemaTypeForSelect | false> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.insert(NotificationsSchema).values({
                userId: data.userId,
                taskId: data.taskId,
                title: data.title,
                body: data.body,
            }).returning()
        );
        if (!result) return false;
        return result[0];
    }

    async fetchByUser(userId: number, cursor?: number) {
        const limit = 30;
        const conditions = [eq(NotificationsSchema.userId, userId)];
        if (cursor) {
            conditions.push(lt(NotificationsSchema.id, cursor));
        }
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.select({
                id: NotificationsSchema.id,
                userId: NotificationsSchema.userId,
                taskId: NotificationsSchema.taskId,
                title: NotificationsSchema.title,
                body: NotificationsSchema.body,
                read: NotificationsSchema.read,
                createdAt: NotificationsSchema.createdAt,
                goalId: TasksSchema.goalId,
                goalListId: TasksSchema.goalListId,
            })
                .from(NotificationsSchema)
                .leftJoin(TasksSchema, eq(NotificationsSchema.taskId, TasksSchema.id))
                .where(and(...conditions))
                .orderBy(desc(NotificationsSchema.id))
                .limit(limit)
        );
        return result || [];
    }

    async markRead(notificationId: number, userId: number): Promise<boolean> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.update(NotificationsSchema)
                .set({ read: true })
                .where(and(
                    eq(NotificationsSchema.id, notificationId),
                    eq(NotificationsSchema.userId, userId),
                ))
        );
        return !!result;
    }

    async deleteDeadlineNotifications(taskId: number): Promise<boolean> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.delete(NotificationsSchema)
                .where(and(
                    eq(NotificationsSchema.taskId, taskId),
                    like(NotificationsSchema.title, 'Deadline:%'),
                ))
        );
        return !!result;
    }

    async deleteOlderThanDays(days: number): Promise<boolean> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.delete(NotificationsSchema)
                .where(lt(NotificationsSchema.createdAt, sql`NOW() - INTERVAL '${sql.raw(String(days))} days'`))
        );
        return !!result;
    }

    async markAllRead(userId: number): Promise<boolean> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.update(NotificationsSchema)
                .set({ read: true })
                .where(and(
                    eq(NotificationsSchema.userId, userId),
                    eq(NotificationsSchema.read, false),
                ))
        );
        return !!result;
    }
}
