import type { FirstDayOfWeek, StartDashboard, StartDashboardBucketTask, TimeReportByUserRow } from 'taskview-api'
import type { ProjectDashboardBucket } from '@/types/project-dashboard.types'

export type MainDashboardFetchArgs = {
  organizationId: number | null
  timezone: string
  weekStart: FirstDayOfWeek
  hoursFrom: string
  hoursTo: string
}

export type MainDashboardStoreState = {
  data: StartDashboard | null
  // Null when the time report is not available to the user
  hoursByUser: TimeReportByUserRow[] | null
  loading: boolean
  failed: boolean
  // The column whose tasks are listed, while its list is open
  bucket: MainDashboardBucketState | null
}

export type MainDashboardBucketState = {
  selection: ProjectDashboardBucket
  tasks: StartDashboardBucketTask[]
  total: number
  loading: boolean
  failed: boolean
}

export type MainDashboardBuildArgs = {
  data: StartDashboard
  hoursByUser: TimeReportByUserRow[] | null
}

export type MainDashboardProjectRow = {
  goalId: number
  name: string
  color: string | null
  total: number
  open: number
  overdue: number
  // 0..100
  progress: number
}
