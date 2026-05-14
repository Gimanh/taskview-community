import type { AppUser } from '../../core/AppUser'
import { eventBus } from '../../core/EventBus'
import { GoalPermissions } from '../../types/auth.types'
import { TimeTrackingRepository } from './TimeTrackingRepository'
import {
    TIME_ENTRY_SOURCE,
    type TimeEntryArgCreate,
    type TimeEntryArgFetchEntries,
    type TimeEntryArgStart,
    type TimeEntryArgStop,
    type TimeEntryArgUpdate,
    type TimeEntryStartResult,
    type TimeEntryUpdateParams,
    type TimeEntryWithUser,
    type TimeReportByDayRow,
    type TimeReportByTaskRow,
    type TimeReportByUserRow,
    type TimeReportContributor,
    type TimeReportRepoFilters,
    type TimeReportRequest,
    type TimeReportSummary,
} from './types'

type ResolvedReportFilters = TimeReportRepoFilters

export class TimeTrackingManager {
    public readonly repository: TimeTrackingRepository
    private readonly user: AppUser

    constructor(user: AppUser) {
        this.user = user
        this.repository = new TimeTrackingRepository()
    }

    private getCurrentUserId(): number | null {
        return this.user.getUserData()?.id ?? null
    }

    private computeDuration(startedAt: Date, endedAt: Date): number {
        return Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000))
    }

    async getActive(): Promise<TimeEntryWithUser | null> {
        const userId = this.getCurrentUserId()
        if (!userId) return null
        return this.repository.findActiveForUser(userId)
    }

    async start(data: TimeEntryArgStart): Promise<TimeEntryStartResult | null> {
        const userId = this.getCurrentUserId()
        if (!userId) return null

        const task = await this.repository.fetchTaskWithGoal(data.taskId)
        if (!task) return null

        for (let attempt = 0; attempt < 2; attempt++) {
            const autoStoppedEntry = await this.closeActiveTimer(userId)

            const insertResult = await this.repository.tryInsertActiveTimer({
                taskId: task.id,
                goalId: task.goalId,
                userId,
                description: data.description ?? null,
                source: TIME_ENTRY_SOURCE.TIMER,
            })

            if (insertResult.entry) {
                const entry = insertResult.entry
                eventBus.emit('time-entry.started', {
                    entry,
                    taskId: entry.taskId,
                    userId: entry.userId,
                    goalId: entry.goalId,
                })
                return { entry, autoStoppedEntry }
            }

            if (!insertResult.conflict) return null
        }

        return null
    }

    private async closeActiveTimer(userId: number): Promise<TimeEntryWithUser | null> {
        const stopped = await this.repository.closeActiveAtomicForUser(userId, new Date())
        if (!stopped) return null

        eventBus.emit('time-entry.stopped', {
            entry: stopped,
            taskId: stopped.taskId,
            userId: stopped.userId,
            goalId: stopped.goalId,
            durationSeconds: stopped.durationSeconds ?? 0,
        })

        return stopped
    }

    async stop(data: TimeEntryArgStop): Promise<TimeEntryWithUser | null> {
        const userId = this.getCurrentUserId()
        if (!userId) return null

        const target = data.entryId
            ? await this.repository.findById(data.entryId)
            : await this.repository.findActiveForUser(userId)

        if (!target || target.endedAt) return null

        const endedAt = new Date()
        const stopped = await this.repository.updateById(target.id, {
            endedAt,
            durationSeconds: this.computeDuration(target.startedAt, endedAt),
        })
        if (!stopped) return null

        eventBus.emit('time-entry.stopped', {
            entry: stopped,
            taskId: stopped.taskId,
            userId: stopped.userId,
            goalId: stopped.goalId,
            durationSeconds: stopped.durationSeconds ?? 0,
        })

        return stopped
    }

    async createManual(data: TimeEntryArgCreate): Promise<TimeEntryWithUser | null> {
        const userId = this.getCurrentUserId()
        if (!userId) return null

        if (data.endedAt.getTime() <= data.startedAt.getTime()) return null

        const task = await this.repository.fetchTaskWithGoal(data.taskId)
        if (!task) return null

        const entry = await this.repository.insert({
            taskId: task.id,
            goalId: task.goalId,
            userId,
            startedAt: data.startedAt,
            endedAt: data.endedAt,
            durationSeconds: this.computeDuration(data.startedAt, data.endedAt),
            description: data.description ?? null,
            source: TIME_ENTRY_SOURCE.MANUAL,
            billable: data.billable,
        })
        if (!entry) return null

        eventBus.emit('time-entry.created', { entry, initiatorId: userId })
        return entry
    }

    async update(data: TimeEntryArgUpdate): Promise<TimeEntryWithUser | null> {
        const userId = this.getCurrentUserId()
        if (!userId) return null

        const existing = await this.repository.findById(data.id)
        if (!existing) return null

        if (existing.endedAt === null) {
            const onlyDescription =
                data.description !== undefined &&
                data.startedAt === undefined &&
                data.endedAt === undefined &&
                data.billable === undefined
            if (!onlyDescription) return null
        }

        const updates: TimeEntryUpdateParams = {}
        const startedAt = data.startedAt ?? existing.startedAt
        const endedAt = data.endedAt ?? existing.endedAt

        if (data.startedAt !== undefined) updates.startedAt = data.startedAt
        if (data.endedAt !== undefined) updates.endedAt = data.endedAt
        if (data.description !== undefined) updates.description = data.description
        if (data.billable !== undefined) updates.billable = data.billable

        if (endedAt && (data.startedAt !== undefined || data.endedAt !== undefined)) {
            if (endedAt.getTime() <= startedAt.getTime()) return null
            updates.durationSeconds = this.computeDuration(startedAt, endedAt)
        }

        const updated = await this.repository.updateById(existing.id, updates)
        if (!updated) return null

        eventBus.emit('time-entry.updated', {
            entry: updated,
            changes: updates as Record<string, unknown>,
            initiatorId: userId,
        })

        return updated
    }

    async delete(id: number): Promise<boolean> {
        const userId = this.getCurrentUserId()
        if (!userId) return false

        const existing = await this.repository.findById(id)
        if (!existing) return false

        const deleted = await this.repository.deleteById(id)
        if (!deleted) return false

        eventBus.emit('time-entry.deleted', {
            entryId: existing.id,
            taskId: existing.taskId,
            goalId: existing.goalId,
            userId: existing.userId,
            initiatorId: userId,
        })

        return true
    }

    async fetchEntries(filters: TimeEntryArgFetchEntries): Promise<TimeEntryWithUser[]> {
        const userId = this.getCurrentUserId()
        if (!userId) return []

        let goalId = filters.goalId
        if (goalId === undefined && filters.taskId !== undefined) {
            const task = await this.repository.fetchTaskWithGoal(filters.taskId)
            if (!task) return []
            goalId = task.goalId
        }

        const hasSingleScope = goalId !== undefined

        let goalIds: number[]
        if (hasSingleScope) {
            goalIds = [goalId!]
        } else {
            if (filters.organizationId === undefined) return []
            const accessibleGoalIds = await this.user.permissionsFetcher.getAccessibleGoalIds(
                filters.organizationId,
                [GoalPermissions.TIMETRACKING_CAN_VIEW, GoalPermissions.TIMETRACKING_CAN_MANAGE_ALL],
            )
            if (accessibleGoalIds.length === 0) return []

            const requested = filters.goalIds && filters.goalIds.length > 0 ? filters.goalIds : null
            goalIds = requested
                ? requested.filter((id) => accessibleGoalIds.includes(id))
                : accessibleGoalIds
            if (goalIds.length === 0) return []
        }

        return this.repository.fetchEntries({
            goalIds,
            taskId: filters.taskId,
            userId: filters.userId,
            billable: filters.billable,
            from: filters.from,
            to: filters.to,
            limit: filters.limit,
            offset: filters.offset,
        })
    }

    async summaryByTask(taskId: number) {
        const userId = this.getCurrentUserId()
        if (!userId) return null

        const task = await this.repository.fetchTaskWithGoal(taskId)
        if (!task) return null

        return this.repository.sumByTask(taskId)
    }

    async summaryByGoal(goalId: number) {
        const userId = this.getCurrentUserId()
        if (!userId) return null

        return this.repository.sumByGoal(goalId)
    }

    async fetchHistory(entryId: number) {
        const userId = this.getCurrentUserId()
        if (!userId) return null

        const existing = await this.repository.findById(entryId)
        if (!existing) return null

        return this.repository.fetchHistory(entryId)
    }

    async getViewableGoalIds(organizationId: number): Promise<number[]> {
        return this.user.permissionsFetcher.getAccessibleGoalIds(organizationId, [
            GoalPermissions.TIMETRACKING_CAN_VIEW,
            GoalPermissions.TIMETRACKING_CAN_MANAGE_ALL,
        ])
    }

    private async resolveReportFilters(req: TimeReportRequest): Promise<ResolvedReportFilters | null> {
        const data = this.user.getUserData()
        if (!data) return null

        const allowedIds = await this.getViewableGoalIds(req.organizationId)
        if (allowedIds.length === 0) return null

        const requestedIds = req.filters.goalIds && req.filters.goalIds.length > 0 ? req.filters.goalIds : null
        const goalIds = requestedIds
            ? requestedIds.filter((id) => allowedIds.includes(id))
            : allowedIds

        if (goalIds.length === 0) return null

        return {
            goalIds,
            userId: req.filters.userId,
            from: req.filters.from,
            to: req.filters.to,
            billable: req.filters.billable,
            timezone: req.filters.timezone,
        }
    }

    async reportByDay(req: TimeReportRequest): Promise<TimeReportByDayRow[]> {
        const resolved = await this.resolveReportFilters(req)
        if (!resolved) return []
        return this.repository.aggregateByDay(resolved)
    }

    async reportByUser(req: TimeReportRequest): Promise<TimeReportByUserRow[]> {
        const resolved = await this.resolveReportFilters(req)
        if (!resolved) return []
        return this.repository.aggregateByUser(resolved)
    }

    async reportByTask(req: TimeReportRequest): Promise<TimeReportByTaskRow[]> {
        const resolved = await this.resolveReportFilters(req)
        if (!resolved) return []
        return this.repository.aggregateByTask(resolved)
    }

    async reportSummary(req: TimeReportRequest): Promise<TimeReportSummary> {
        const resolved = await this.resolveReportFilters(req)
        if (!resolved) {
            return { totalSeconds: 0, totalBillableSeconds: 0, entriesCount: 0 }
        }
        return this.repository.getReportSummary(resolved)
    }

    async reportContributors(req: TimeReportRequest): Promise<TimeReportContributor[]> {
        const resolved = await this.resolveReportFilters(req)
        if (!resolved) return []
        return this.repository.fetchContributors({ ...resolved, userId: undefined })
    }
}
