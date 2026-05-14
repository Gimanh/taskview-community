import TvApiBase from './base'
import type { AppResponse } from '@/api/base.types'
import type {
    TimeEntryCreateManualArg,
    TimeEntryFetchFilters,
    TimeEntryHistoryItem,
    TimeEntryItem,
    TimeEntryStartArg,
    TimeEntryStartResult,
    TimeEntryStopArg,
    TimeEntrySummaryByGoal,
    TimeEntrySummaryByTask,
    TimeEntryUpdateArg,
    TimeReportByDayRow,
    TimeReportByTaskRow,
    TimeReportByUserRow,
    TimeReportContributor,
    TimeReportFilters,
    TimeReportSummary,
} from './time-tracking.types'

export default class TvTimeTrackingApi extends TvApiBase {
    protected moduleUrl = '/module/time-tracking'

    private static reportParams(filters: TimeReportFilters) {
        const params: Record<string, string | number | boolean> = {
            organizationId: filters.organizationId,
            from: filters.from instanceof Date ? filters.from.toISOString() : filters.from,
            to: filters.to instanceof Date ? filters.to.toISOString() : filters.to,
        }
        if (filters.goalIds && filters.goalIds.length > 0) {
            params.goalIds = filters.goalIds.join(',')
        }
        if (filters.userId !== undefined) params.userId = filters.userId
        if (filters.billable !== undefined) params.billable = filters.billable
        if (filters.timezone !== undefined) params.timezone = filters.timezone
        return params
    }

    public async start(data: TimeEntryStartArg) {
        return this.request(this.$axios.post<AppResponse<TimeEntryStartResult>>(`${this.moduleUrl}/start`, data))
    }

    public async stop(data: TimeEntryStopArg = {}) {
        return this.request(this.$axios.post<AppResponse<TimeEntryItem>>(`${this.moduleUrl}/stop`, data))
    }

    public async getActive() {
        return this.request(this.$axios.get<AppResponse<TimeEntryItem | null>>(`${this.moduleUrl}/active`))
    }

    public async createManual(data: TimeEntryCreateManualArg) {
        return this.request(this.$axios.post<AppResponse<TimeEntryItem>>(`${this.moduleUrl}/entries`, data))
    }

    public async update(data: TimeEntryUpdateArg) {
        const { id, ...rest } = data
        return this.request(this.$axios.patch<AppResponse<TimeEntryItem>>(`${this.moduleUrl}/entries/${id}`, rest))
    }

    public async delete(id: number) {
        return this.request(
            this.$axios.delete<AppResponse<{ deleted: boolean }>>(`${this.moduleUrl}/entries/${id}`),
        )
    }

    public async fetchEntries(filters: TimeEntryFetchFilters = {}) {
        const { goalIds, ...rest } = filters
        const params: Record<string, unknown> = { ...rest }
        if (goalIds && goalIds.length > 0) params.goalIds = goalIds.join(',')
        return this.request(
            this.$axios.get<AppResponse<TimeEntryItem[]>>(`${this.moduleUrl}/entries`, { params }),
        )
    }

    public async summaryByTask(taskId: number) {
        return this.request(
            this.$axios.get<AppResponse<TimeEntrySummaryByTask>>(`${this.moduleUrl}/summary/task/${taskId}`),
        )
    }

    public async summaryByGoal(goalId: number) {
        return this.request(
            this.$axios.get<AppResponse<TimeEntrySummaryByGoal>>(`${this.moduleUrl}/summary/goal/${goalId}`),
        )
    }

    public async fetchHistory(entryId: number) {
        return this.request(
            this.$axios.get<AppResponse<TimeEntryHistoryItem[]>>(`${this.moduleUrl}/entries/${entryId}/history`),
        )
    }

    public async reportSummary(filters: TimeReportFilters) {
        return this.request(
            this.$axios.get<AppResponse<TimeReportSummary>>(`${this.moduleUrl}/reports/summary`, {
                params: TvTimeTrackingApi.reportParams(filters),
            }),
        )
    }

    public async reportByDay(filters: TimeReportFilters) {
        return this.request(
            this.$axios.get<AppResponse<TimeReportByDayRow[]>>(`${this.moduleUrl}/reports/by-day`, {
                params: TvTimeTrackingApi.reportParams(filters),
            }),
        )
    }

    public async reportByUser(filters: TimeReportFilters) {
        return this.request(
            this.$axios.get<AppResponse<TimeReportByUserRow[]>>(`${this.moduleUrl}/reports/by-user`, {
                params: TvTimeTrackingApi.reportParams(filters),
            }),
        )
    }

    public async reportByTask(filters: TimeReportFilters) {
        return this.request(
            this.$axios.get<AppResponse<TimeReportByTaskRow[]>>(`${this.moduleUrl}/reports/by-task`, {
                params: TvTimeTrackingApi.reportParams(filters),
            }),
        )
    }

    public async reportContributors(filters: TimeReportFilters) {
        return this.request(
            this.$axios.get<AppResponse<TimeReportContributor[]>>(`${this.moduleUrl}/reports/contributors`, {
                params: TvTimeTrackingApi.reportParams(filters),
            }),
        )
    }
}
