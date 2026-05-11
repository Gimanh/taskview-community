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
} from './time-tracking.types'

export default class TvTimeTrackingApi extends TvApiBase {
    protected moduleUrl = '/module/time-tracking'

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
        return this.request(
            this.$axios.get<AppResponse<TimeEntryItem[]>>(`${this.moduleUrl}/entries`, { params: filters }),
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
}
