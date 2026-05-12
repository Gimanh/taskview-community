import { and, desc, eq, gte, inArray, isNull, lte, sql, type SQL } from 'drizzle-orm'
import {
    TimeEntriesSchema,
    TimeEntriesHistorySchema,
    TasksSchema,
    UsersSchema,
    type TimeEntriesHistorySchemaTypeForSelect,
} from 'taskview-db-schemas'
import { Database } from '../../modules/db'
import { $logger } from '../../modules/logget'
import { callWithCatch } from '../../utils/helpers'
import type {
    TimeEntryFilters,
    TimeEntryGoalSummary,
    TimeEntryInsertParams,
    TimeEntryInsertResult,
    TimeEntryTaskSummary,
    TimeEntryUpdateParams,
    TimeEntryWithUser,
} from './types'

const PG_UNIQUE_VIOLATION = '23505'

export class TimeTrackingRepository {
    private readonly db: Database

    private static readonly entryWithUserProjection = {
        id: TimeEntriesSchema.id,
        taskId: TimeEntriesSchema.taskId,
        goalId: TimeEntriesSchema.goalId,
        userId: TimeEntriesSchema.userId,
        startedAt: TimeEntriesSchema.startedAt,
        endedAt: TimeEntriesSchema.endedAt,
        durationSeconds: TimeEntriesSchema.durationSeconds,
        description: TimeEntriesSchema.description,
        source: TimeEntriesSchema.source,
        billable: TimeEntriesSchema.billable,
        autoStopped: TimeEntriesSchema.autoStopped,
        createdAt: TimeEntriesSchema.createdAt,
        editedAt: TimeEntriesSchema.editedAt,
        userEmail: UsersSchema.email,
    }

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

    async findActiveForUser(userId: number): Promise<TimeEntryWithUser | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select(TimeTrackingRepository.entryWithUserProjection)
                .from(TimeEntriesSchema)
                .leftJoin(UsersSchema, eq(UsersSchema.id, TimeEntriesSchema.userId))
                .where(and(eq(TimeEntriesSchema.userId, userId), isNull(TimeEntriesSchema.endedAt))),
        )
        return result?.[0] ?? null
    }

    async findById(id: number): Promise<TimeEntryWithUser | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select(TimeTrackingRepository.entryWithUserProjection)
                .from(TimeEntriesSchema)
                .leftJoin(UsersSchema, eq(UsersSchema.id, TimeEntriesSchema.userId))
                .where(eq(TimeEntriesSchema.id, id)),
        )
        return result?.[0] ?? null
    }

    async findByIds(ids: number[]): Promise<TimeEntryWithUser[]> {
        if (ids.length === 0) return []
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select(TimeTrackingRepository.entryWithUserProjection)
                .from(TimeEntriesSchema)
                .leftJoin(UsersSchema, eq(UsersSchema.id, TimeEntriesSchema.userId))
                .where(inArray(TimeEntriesSchema.id, ids)),
        )
        return result ?? []
    }

    async insert(data: TimeEntryInsertParams): Promise<TimeEntryWithUser | null> {
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
                .returning({ id: TimeEntriesSchema.id }),
        )
        const id = result?.[0]?.id
        if (!id) return null
        return this.findById(id)
    }

    async tryInsertActiveTimer(data: TimeEntryInsertParams): Promise<TimeEntryInsertResult> {
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
                .returning({ id: TimeEntriesSchema.id })
            const id = result?.[0]?.id
            if (!id) return { entry: null, conflict: false }
            const entry = await this.findById(id)
            return { entry, conflict: false }
        } catch (error) {
            const code = (error as { code?: string } | null)?.code
            if (code === PG_UNIQUE_VIOLATION) {
                return { entry: null, conflict: true }
            }
            $logger.error(error, 'TimeTrackingRepository.tryInsertActiveTimer')
            return { entry: null, conflict: false }
        }
    }

    async updateById(id: number, data: TimeEntryUpdateParams): Promise<TimeEntryWithUser | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .update(TimeEntriesSchema)
                .set(data)
                .where(eq(TimeEntriesSchema.id, id))
                .returning({ id: TimeEntriesSchema.id }),
        )
        const updatedId = result?.[0]?.id
        if (!updatedId) return null
        return this.findById(updatedId)
    }

    async deleteById(id: number): Promise<boolean> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.delete(TimeEntriesSchema).where(eq(TimeEntriesSchema.id, id)),
        )
        return !!result?.rowCount
    }

    async fetchEntries(filters: TimeEntryFilters): Promise<TimeEntryWithUser[]> {
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
                .select(TimeTrackingRepository.entryWithUserProjection)
                .from(TimeEntriesSchema)
                .leftJoin(UsersSchema, eq(UsersSchema.id, TimeEntriesSchema.userId))
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

    async autoStopOverdue(): Promise<TimeEntryWithUser[]> {
        const updated = await callWithCatch(() =>
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
                .returning({ id: TimeEntriesSchema.id }),
        )
        const ids = (updated ?? []).map((r) => r.id)
        return this.findByIds(ids)
    }
}
