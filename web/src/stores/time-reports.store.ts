import { defineStore } from 'pinia'
import { nextTick } from 'vue'
import type {
  TimeReportByDayRow,
  TimeReportByTaskRow,
  TimeReportByUserRow,
  TimeReportFilters,
} from 'taskview-api'
import { $tvApi } from '@/plugins/axios'
import {
  resolveTimeReportsErrorKey,
  toTimeReportFilters,
  todayEndOfDayIso,
  weekAgoStartOfDayIso,
} from '@/helpers/timeReports'
import type {
  ReportView,
  TimeReportsInitParams,
  TimeReportsState,
  TimeReportViewData,
} from './time-reports.types'

export const useTimeReportsStore = defineStore('timeReports', {
  state: (): TimeReportsState => ({
    filters: {
      organizationId: null,
      goalIds: [],
      userId: null,
      from: weekAgoStartOfDayIso(),
      to: todayEndOfDayIso(),
      billable: true,
    },
    view: 'by-task',
    summary: null,
    byDay: [],
    byUser: [],
    byTask: [],
    contributors: [],
    entries: [],
    loading: false,
    initialized: false,
    requestId: 0,
    lastError: null,
  }),
  actions: {
    setError(err: unknown): void {
      this.lastError = { key: resolveTimeReportsErrorKey(err), ts: Date.now() }
    },

    async init(params: TimeReportsInitParams): Promise<void> {
      this.initialized = false
      this.filters.organizationId = params.organizationId
      this.filters.goalIds = params.goalIds
      await nextTick()
      this.initialized = true
      await this.refreshAll()
    },

    setOrganization(orgId: number): void {
      this.filters.organizationId = orgId
    },

    async setView(view: ReportView): Promise<void> {
      if (this.view === view) return
      this.view = view
      await this.fetchCurrentView()
    },

    setPeriod(from: string, to: string): void {
      this.filters.from = from
      this.filters.to = to
    },

    setGoalIds(ids: number[]): void {
      this.filters.goalIds = ids
    },

    setUserId(id: number | null): void {
      this.filters.userId = id
    },

    setBillable(value: boolean | null): void {
      this.filters.billable = value
    },

    async refreshAll(): Promise<void> {
      const filters = toTimeReportFilters(this.filters)
      if (!filters) return
      const contributorsFilters = { ...filters, userId: undefined, billable: undefined }
      const view = this.view
      const myId = ++this.requestId
      this.loading = true
      try {
        const [summary, contributors, entries, viewData] = await Promise.all([
          $tvApi.timeTracking.reportSummary(filters),
          $tvApi.timeTracking.reportContributors(contributorsFilters),
          $tvApi.timeTracking.fetchEntries({
            organizationId: this.filters.organizationId ?? undefined,
            goalIds: this.filters.goalIds.length > 0 ? this.filters.goalIds : undefined,
            userId: this.filters.userId ?? undefined,
            billable: this.filters.billable ?? undefined,
            from: this.filters.from,
            to: this.filters.to,
            limit: 50,
          }),
          this.fetchViewData(view, filters),
        ])
        if (myId !== this.requestId) return
        this.summary = summary ?? null
        this.contributors = contributors ?? []
        this.entries = entries ?? []
        this.assignViewData(view, viewData)
      } catch (err) {
        if (myId !== this.requestId) return
        this.setError(err)
      } finally {
        if (myId === this.requestId) this.loading = false
      }
    },

    async fetchCurrentView(): Promise<void> {
      const filters = toTimeReportFilters(this.filters)
      if (!filters) return
      const view = this.view
      const myId = ++this.requestId
      this.loading = true
      try {
        const data = await this.fetchViewData(view, filters)
        if (myId !== this.requestId) return
        this.assignViewData(view, data)
      } catch (err) {
        if (myId !== this.requestId) return
        this.setError(err)
      } finally {
        if (myId === this.requestId) this.loading = false
      }
    },

    fetchViewData(view: ReportView, filters: TimeReportFilters): Promise<TimeReportViewData> {
      if (view === 'by-task') return $tvApi.timeTracking.reportByTask(filters)
      if (view === 'by-user') return $tvApi.timeTracking.reportByUser(filters)
      return $tvApi.timeTracking.reportByDay(filters)
    },

    assignViewData(view: ReportView, data: TimeReportViewData): void {
      if (view === 'by-task') this.byTask = (data as TimeReportByTaskRow[]) ?? []
      else if (view === 'by-user') this.byUser = (data as TimeReportByUserRow[]) ?? []
      else this.byDay = (data as TimeReportByDayRow[]) ?? []
    },
  },
})
