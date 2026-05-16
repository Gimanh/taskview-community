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
    TimeReportByDayRow,
    TimeReportByTaskRow,
    TimeReportByUserRow,
    TimeReportContributor,
    TimeReportRepoFilters,
    TimeReportSummary,
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

    async closeActiveAtomicForUser(userId: number, endedAt: Date): Promise<TimeEntryWithUser | null> {
        const updated = await callWithCatch(() =>
            this.db.dbDrizzle
                .update(TimeEntriesSchema)
                .set({
                    endedAt,
                    durationSeconds: sql<number>`greatest(0, round(extract(epoch from ${endedAt}::timestamp - ${TimeEntriesSchema.startedAt}))::int)`,
                })
                .where(and(eq(TimeEntriesSchema.userId, userId), isNull(TimeEntriesSchema.endedAt)))
                .returning({ id: TimeEntriesSchema.id }),
        )
        if (!updated || updated.length === 0) return null
        return this.findById(updated[0].id)
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
        if (filters.goalIds !== undefined && filters.goalIds.length === 0) return []

        const conditions: SQL[] = []
        if (filters.goalIds !== undefined) conditions.push(inArray(TimeEntriesSchema.goalId, filters.goalIds))
        if (filters.taskId !== undefined) conditions.push(eq(TimeEntriesSchema.taskId, filters.taskId))
        if (filters.userId !== undefined) conditions.push(eq(TimeEntriesSchema.userId, filters.userId))
        if (filters.billable !== undefined) conditions.push(eq(TimeEntriesSchema.billable, filters.billable))
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

    private reportConditions(filters: TimeReportRepoFilters): SQL[] {
        const conditions: SQL[] = [
            inArray(TimeEntriesSchema.goalId, filters.goalIds),
            gte(TimeEntriesSchema.startedAt, filters.from),
            lte(TimeEntriesSchema.startedAt, filters.to),
        ]
        if (filters.userId !== undefined) conditions.push(eq(TimeEntriesSchema.userId, filters.userId))
        if (filters.billable !== undefined) conditions.push(eq(TimeEntriesSchema.billable, filters.billable))
        return conditions
    }

    async aggregateByDay(filters: TimeReportRepoFilters): Promise<TimeReportByDayRow[]> {
        if (filters.goalIds.length === 0) return []
        const tzLiteral = filters.timezone ? `'${filters.timezone.replace(/'/g, "''")}'` : null
        const dayExpr = tzLiteral
            ? sql<string>`to_char((${TimeEntriesSchema.startedAt} AT TIME ZONE 'UTC' AT TIME ZONE ${sql.raw(tzLiteral)})::date, 'YYYY-MM-DD')`
            : sql<string>`to_char(${TimeEntriesSchema.startedAt}::date, 'YYYY-MM-DD')`
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select({
                    day: dayExpr,
                    totalSeconds: sql<number>`coalesce(sum(${TimeEntriesSchema.durationSeconds}), 0)::int`,
                    entriesCount: sql<number>`count(*)::int`,
                })
                .from(TimeEntriesSchema)
                .where(and(...this.reportConditions(filters)))
                .groupBy(dayExpr)
                .orderBy(dayExpr),
        )
        return result ?? []
    }

    async aggregateByUser(filters: TimeReportRepoFilters): Promise<TimeReportByUserRow[]> {
        if (filters.goalIds.length === 0) return []
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select({
                    userId: TimeEntriesSchema.userId,
                    userEmail: UsersSchema.email,
                    totalSeconds: sql<number>`coalesce(sum(${TimeEntriesSchema.durationSeconds}), 0)::int`,
                    entriesCount: sql<number>`count(*)::int`,
                })
                .from(TimeEntriesSchema)
                .leftJoin(UsersSchema, eq(UsersSchema.id, TimeEntriesSchema.userId))
                .where(and(...this.reportConditions(filters)))
                .groupBy(TimeEntriesSchema.userId, UsersSchema.email)
                .orderBy(sql`coalesce(sum(${TimeEntriesSchema.durationSeconds}), 0) desc`),
        )
        return result ?? []
    }

    async aggregateByTask(filters: TimeReportRepoFilters): Promise<TimeReportByTaskRow[]> {
        if (filters.goalIds.length === 0) return []
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select({
                    taskId: TimeEntriesSchema.taskId,
                    taskDescription: TasksSchema.description,
                    goalId: TimeEntriesSchema.goalId,
                    totalSeconds: sql<number>`coalesce(sum(${TimeEntriesSchema.durationSeconds}), 0)::int`,
                    entriesCount: sql<number>`count(*)::int`,
                })
                .from(TimeEntriesSchema)
                .leftJoin(TasksSchema, eq(TasksSchema.id, TimeEntriesSchema.taskId))
                .where(and(...this.reportConditions(filters)))
                .groupBy(TimeEntriesSchema.taskId, TasksSchema.description, TimeEntriesSchema.goalId)
                .orderBy(sql`coalesce(sum(${TimeEntriesSchema.durationSeconds}), 0) desc`),
        )
        return result ?? []
    }

    async getReportSummary(filters: TimeReportRepoFilters): Promise<TimeReportSummary> {
        const empty: TimeReportSummary = { totalSeconds: 0, totalBillableSeconds: 0, entriesCount: 0 }
        if (filters.goalIds.length === 0) return empty
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select({
                    totalSeconds: sql<number>`coalesce(sum(${TimeEntriesSchema.durationSeconds}), 0)::int`,
                    totalBillableSeconds: sql<number>`coalesce(sum(case when ${TimeEntriesSchema.billable} then ${TimeEntriesSchema.durationSeconds} else 0 end), 0)::int`,
                    entriesCount: sql<number>`count(*)::int`,
                })
                .from(TimeEntriesSchema)
                .where(and(...this.reportConditions(filters))),
        )
        return result?.[0] ?? empty
    }

    async fetchContributors(filters: TimeReportRepoFilters): Promise<TimeReportContributor[]> {
        if (filters.goalIds.length === 0) return []
        const result = await callWithCatch(() =>
            this.db.dbDrizzle
                .select({
                    userId: TimeEntriesSchema.userId,
                    userEmail: UsersSchema.email,
                    totalSeconds: sql<number>`coalesce(sum(${TimeEntriesSchema.durationSeconds}), 0)::int`,
                    entriesCount: sql<number>`count(*)::int`,
                })
                .from(TimeEntriesSchema)
                .leftJoin(UsersSchema, eq(UsersSchema.id, TimeEntriesSchema.userId))
                .where(and(...this.reportConditions(filters)))
                .groupBy(TimeEntriesSchema.userId, UsersSchema.email)
                .orderBy(sql`coalesce(sum(${TimeEntriesSchema.durationSeconds}), 0) desc`),
        )
        return result ?? []
    }
}
