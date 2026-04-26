export type AnalyticsChartType =
  | 'line'
  | 'bar'
  | 'area'
  | 'stackedBar'
  | 'stackedArea'
  | 'horizontalBar'
  | 'donut'
  | 'histogram'
  | 'radar'

export type AnalyticsScope =
  | { kind: 'org' }
  | { kind: 'project'; goalId: number }

export type AnalyticsPeriod = '7d' | '30d' | '90d' | '180d' | '365d' | 'custom'

export type AnalyticsRange = {
  from: string
  to: string
}

export type LocalizedText = {
  ru: string
  en: string
}

export type AnalyticsUnit =
  | 'count'
  | 'days'
  | 'hours'
  | 'percent'
  | 'currency'

export type AnalyticsColorToken =
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'neutral'
  | 'info'

export type AnalyticsDataset = {
  id: string
  label: LocalizedText
  values: (number | null)[]
  colorToken?: AnalyticsColorToken
  stack?: string
  meta?: Record<string, unknown>
}

export type AnalyticsReferenceLine = {
  id: string
  label: LocalizedText
  value: number
  axis: 'x' | 'y'
  colorToken?: AnalyticsColorToken
}

export type AnalyticsSeriesPayload = {
  kind: 'series'
  labels: string[]
  labelKind: 'date' | 'category'
  datasets: AnalyticsDataset[]
  referenceLines?: AnalyticsReferenceLine[]
  xAxisLabel?: LocalizedText
  yAxisLabel?: LocalizedText
  unit: AnalyticsUnit
}

export type AnalyticsKpiDelta = {
  value: number
  direction: 'up' | 'down' | 'flat'
  isGood: boolean
}

export type AnalyticsKpiPayload = {
  kind: 'kpi'
  value: number
  delta?: AnalyticsKpiDelta
  unit: AnalyticsUnit
  sparkline?: number[]
}

export type AnalyticsSectionGroup =
  | 'kpi'
  | 'productivity'
  | 'quality'
  | 'workload'
  | 'financial'
  | 'usage'

export type AnalyticsDrillDownKind = 'tasks' | 'users' | 'projects'

export type AnalyticsSectionHelp = {
  summary: LocalizedText
  details: LocalizedText
}

export type AnalyticsSection = {
  id: string
  title: LocalizedText
  description?: LocalizedText
  help?: AnalyticsSectionHelp
  group: AnalyticsSectionGroup
  allowedChartTypes: AnalyticsChartType[]
  defaultChartType: AnalyticsChartType | null
  payload: AnalyticsSeriesPayload | AnalyticsKpiPayload
  drillDown?: { kind: AnalyticsDrillDownKind }
  generatedAt: string
}

export type AnalyticsAvailableGoal = {
  id: number
  name: string
}

export type AnalyticsSectionsResponse = {
  scope: AnalyticsScope
  period: AnalyticsPeriod
  range: AnalyticsRange
  sections: AnalyticsSection[]
  availableGoals: AnalyticsAvailableGoal[]
  failedSectionIds: string[]
}

export type AnalyticsFetchSectionsArg = {
  scope: AnalyticsScope
  organizationId: number
  period: AnalyticsPeriod
  from?: string
  to?: string
  sections?: string[]
}

export type AnalyticsDrillDownTask = {
  id: number
  description: string
  goalId: number
  goalName: string
  complete: boolean
  priorityId: number | null
  endDate: string | null
  date_creation: string
  date_complete: string | null
}

export type AnalyticsDrillDownResponse = {
  sectionId: string
  tasks: AnalyticsDrillDownTask[]
  total: number
}

export type AnalyticsFetchDrillDownArg = {
  sectionId: string
  scope: AnalyticsScope
  organizationId: number
  period: AnalyticsPeriod
  from?: string
  to?: string
  bucket?: string
  index?: number
  datasetId?: string
  meta?: Record<string, unknown>
}
