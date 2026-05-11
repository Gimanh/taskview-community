import { and, desc, eq, gte, isNull, lte, sql, type SQL } from 'drizzle-orm'
import {
    TimeEntriesSchema,
    TimeEntriesHistorySchema,
    TasksSchema,
    type TimeEntriesSchemaTypeForSelect,
    type TimeEntriesHistorySchemaTypeForSelect,
} from 'taskview-db-schemas'
import { Database } from '../../modules/db'
import { $logger } from '../../modules/logget'
import { callWithCatch } from '../../utils/helpers'

const PG_UNIQUE_VIOLATION = '23505'
import type {
    TimeEntryFilters,
    TimeEntryGoalSummary,
    TimeEntryInsertParams,
    TimeEntryTaskSummary,
    TimeEntryUpdateParams,
} from './types'

export class TimeTrackingRepository {
    private readonly db: Database

    constructor() {
        this.db = Database.getInstance()
    }

    async fetchTaskWithGoal(taskId: number): Promise<{ id: number; goalId: number } | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select({ id: TasksSchema.id, goalId: TasksSchema.goalId })
                .from(TasksSchema)
                .where(eq(TasksSchema.id, taskId)),
        )
        return result?.[0] ?? null
    }

    async findActiveForUser(userId: number): Promise<TimeEntriesSchemaTypeForSelect | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select()
                .from(TimeEntriesSchema)
                .where(and(eq(TimeEntriesSchema.userId, userId), isNull(TimeEntriesSchema.endedAt))),
        )
        return result?.[0] ?? null
    }

    async findById(id: number): Promise<TimeEntriesSchemaTypeForSelect | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.select().from(TimeEntriesSchema).where(eq(TimeEntriesSchema.id, id)),
        )
        return result?.[0] ?? null
    }

    async insert(data: TimeEntryInsertParams): Promise<TimeEntriesSchemaTypeForSelect | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .insert(TimeEntriesSchema)
                .values({
                    taskId: data.taskId,
                    goalId: data.goalId,
                    userId: data.userId,
                    startedAt: data.startedAt,
                    endedAt: data.endedAt ?? null,
                    durationSeconds: data.durationSeconds ?? null,
                    description: data.description ?? null,
                    source: data.source,
                    billable: data.billable ?? true,
                })
                .returning(),
        )
        return result?.[0] ?? null
    }

    async tryInsertActiveTimer(
        data: TimeEntryInsertParams,
    ): Promise<{ entry: TimeEntriesSchemaTypeForSelect | null; conflict: boolean }> {
        try {
            const result = await this.db.dbDrizzle
                .insert(TimeEntriesSchema)
                .values({
                    taskId: data.taskId,
                    goalId: data.goalId,
                    userId: data.userId,
                    startedAt: data.startedAt,
                    endedAt: data.endedAt ?? null,
                    durationSeconds: data.durationSeconds ?? null,
                    description: data.description ?? null,
                    source: data.source,
                    billable: data.billable ?? true,
                })
                .returning()
            return { entry: result?.[0] ?? null, conflict: false }
        } catch (error) {
            const code = (error as { code?: string } | null)?.code
            if (code === PG_UNIQUE_VIOLATION) {
                return { entry: null, conflict: true }
            }
            $logger.error(error, 'TimeTrackingRepository.tryInsertActiveTimer')
            return { entry: null, conflict: false }
        }
    }

    async updateById(id: number, data: TimeEntryUpdateParams): Promise<TimeEntriesSchemaTypeForSelect | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .update(TimeEntriesSchema)
                .set(data)
                .where(eq(TimeEntriesSchema.id, id))
                .returning(),
        )
        return result?.[0] ?? null
    }

    async deleteById(id: number): Promise<boolean> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.delete(TimeEntriesSchema).where(eq(TimeEntriesSchema.id, id)),
        )
        return !!result?.rowCount
    }

    async fetchEntries(filters: TimeEntryFilters): Promise<TimeEntriesSchemaTypeForSelect[]> {
        const conditions: SQL[] = []
        if (filters.goalId !== undefined) conditions.push(eq(TimeEntriesSchema.goalId, filters.goalId))
        if (filters.taskId !== undefined) conditions.push(eq(TimeEntriesSchema.taskId, filters.taskId))
        if (filters.userId !== undefined) conditions.push(eq(TimeEntriesSchema.userId, filters.userId))
        if (filters.from !== undefined) conditions.push(gte(TimeEntriesSchema.startedAt, filters.from))
        if (filters.to !== undefined) conditions.push(lte(TimeEntriesSchema.startedAt, filters.to))

        const limit = Math.min(filters.limit ?? 50, 500)
        const offset = filters.offset ?? 0

        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select()
                .from(TimeEntriesSchema)
                .where(conditions.length > 0 ? and(...conditions) : undefined)
                .orderBy(desc(TimeEntriesSchema.startedAt))
                .limit(limit)
                .offset(offset),
        )
        return result ?? []
    }

    async sumByTask(taskId: number): Promise<TimeEntryTaskSummary> {
        const total = await callWithCatch(() =>
            this.db.dbDrizzle
                .select({ total: sql<number>`coalesce(sum(${TimeEntriesSchema.durationSeconds}), 0)::int` })
                .from(TimeEntriesSchema)
                .where(eq(TimeEntriesSchema.taskId, taskId)),
        )

        const byUser = await callWithCatch(() =>
            this.db.dbDrizzle
                .select({
                    userId: TimeEntriesSchema.userId,
                    seconds: sql<number>`coalesce(sum(${TimeEntriesSchema.durationSeconds}), 0)::int`,
                })
                .from(TimeEntriesSchema)
                .where(eq(TimeEntriesSchema.taskId, taskId))
                .groupBy(TimeEntriesSchema.userId),
        )

        return {
            totalSeconds: total?.[0]?.total ?? 0,
            byUser: byUser ?? [],
        }
    }

    async sumByGoal(goalId: number): Promise<TimeEntryGoalSummary> {
        const total = await callWithCatch(() =>
            this.db.dbDrizzle
                .select({ total: sql<number>`coalesce(sum(${TimeEntriesSchema.durationSeconds}), 0)::int` })
                .from(TimeEntriesSchema)
                .where(eq(TimeEntriesSchema.goalId, goalId)),
        )

        const byUser = await callWithCatch(() =>
            this.db.dbDrizzle
                .select({
                    userId: TimeEntriesSchema.userId,
                    seconds: sql<number>`coalesce(sum(${TimeEntriesSchema.durationSeconds}), 0)::int`,
                })
                .from(TimeEntriesSchema)
                .where(eq(TimeEntriesSchema.goalId, goalId))
                .groupBy(TimeEntriesSchema.userId),
        )

        const byTask = await callWithCatch(() =>
            this.db.dbDrizzle
                .select({
                    taskId: TimeEntriesSchema.taskId,
                    seconds: sql<number>`coalesce(sum(${TimeEntriesSchema.durationSeconds}), 0)::int`,
                })
                .from(TimeEntriesSchema)
                .where(eq(TimeEntriesSchema.goalId, goalId))
                .groupBy(TimeEntriesSchema.taskId),
        )

        return {
            totalSeconds: total?.[0]?.total ?? 0,
            byUser: byUser ?? [],
            byTask: byTask ?? [],
        }
    }

    async fetchHistory(entryId: number): Promise<TimeEntriesHistorySchemaTypeForSelect[]> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select()
                .from(TimeEntriesHistorySchema)
                .where(eq(TimeEntriesHistorySchema.entryId, entryId))
                .orderBy(desc(TimeEntriesHistorySchema.editDate)),
        )
        return result ?? []
    }

    async autoStopOverdue(): Promise<TimeEntriesSchemaTypeForSelect[]> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .update(TimeEntriesSchema)
                .set({
                    endedAt: sql`now()`,
                    autoStopped: true,
                    durationSeconds: sql<number>`extract(epoch from (now() - ${TimeEntriesSchema.startedAt}))::int`,
                })
                .where(
                    and(
                        isNull(TimeEntriesSchema.endedAt),
                        sql`${TimeEntriesSchema.id} IN (
                            SELECT te.id
                            FROM tasks.time_entries te
                            JOIN tasks.goals g ON g.id = te.goal_id
                            JOIN tv_auth.organizations o ON o.id = g.organization_id
                            WHERE te.ended_at IS NULL
                              AND o.time_tracking_autostop_hours IS NOT NULL
                              AND te.started_at < now() - (o.time_tracking_autostop_hours || ' hours')::interval
                        )`,
                    ),
                )
                .returning(),
        )
        return result ?? []
    }
}
