import type {
  AnalyticsAvailableGoal,
  AnalyticsDrillDownTask,
  AnalyticsPeriod,
  AnalyticsScope,
  AnalyticsSection,
  AnalyticsSectionsResponse,
} from 'taskview-api'

export type AnalyticsDrillDownState = {
  open: boolean
  loading: boolean
  sectionId: string | null
  sectionTitle: string | null
  bucket: string | null
  tasks: AnalyticsDrillDownTask[]
  error: AnalyticsError
}

export type AnalyticsErrorKind = 'forbidden' | 'network' | 'server' | 'unknown'

export type AnalyticsError = {
  kind: AnalyticsErrorKind
  status?: number
} | null

export type AnalyticsState = {
  scope: AnalyticsScope
  period: AnalyticsPeriod
  customFrom: string | null
  customTo: string | null
  sections: AnalyticsSection[]
  failedSectionIds: string[]
  availableGoals: AnalyticsAvailableGoal[]
  range: AnalyticsSectionsResponse['range'] | null
  loading: boolean
  error: AnalyticsError
  drillDown: AnalyticsDrillDownState
}

export type AnalyticsOpenDrillDownArgs = {
  sectionId: string
  sectionTitle: string
  bucket: string
  index: number
  datasetId: string
  meta?: Record<string, unknown>
}
