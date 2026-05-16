import type {
  TimeEntryItem,
  TimeReportByDayRow,
  TimeReportByTaskRow,
  TimeReportByUserRow,
  TimeReportContributor,
  TimeReportSummary,
} from 'taskview-api'

export type ReportView = 'by-task' | 'by-user' | 'by-day'

export type TimeReportViewData =
  | TimeReportByTaskRow[]
  | TimeReportByUserRow[]
  | TimeReportByDayRow[]
  | undefined

export type TimeReportsInitParams = {
  organizationId: number
  goalIds: number[]
}

export type TimeReportsFiltersState = {
  organizationId: number | null
  goalIds: number[]
  userId: number | null
  from: string
  to: string
  billable: boolean | null
}

export interface TimeReportsState {
  filters: TimeReportsFiltersState
  view: ReportView
  summary: TimeReportSummary | null
  byDay: TimeReportByDayRow[]
  byUser: TimeReportByUserRow[]
  byTask: TimeReportByTaskRow[]
  contributors: TimeReportContributor[]
  entries: TimeEntryItem[]
  loading: boolean
  initialized: boolean
  requestId: number
  lastError: { key: string; ts: number } | null
}
