// SQL row types returned by each section's query.
// Field names match the SELECT aliases verbatim (snake_case where applicable).

// ===== KPI =====

export type CreatedTasksKpiRow = { count: number }
export type CompletedTasksKpiRow = { count: number }
export type OverdueKpiRow = { count: number }
export type CycleTimeKpiRow = { median: number | null }
export type TotalIncomeKpiRow = { total: number }
export type TotalExpenseKpiRow = { total: number }
export type PlannedIncomeKpiRow = { total: number }
export type PlannedExpenseKpiRow = { total: number }
export type NetProfitKpiRow = { income: number; expense: number }
export type AmountCoverageKpiRow = { total: number; with_amount: number }

// ===== Productivity =====

export type ThroughputSectionRow = {
  bucket: string
  created: number
  completed: number
}

export type PriorityMixOverTimeSectionRow = {
  bucket: string
  high: number
  medium: number
  low: number
  none: number
}

// ===== Workload =====

export type WorkloadByAssigneeSectionRow = {
  user_id: number | null
  user_name: string | null
  high: number
  medium: number
  low: number
  no_priority: number
}

export type BlockedByDependenciesSectionRow = {
  goal_id: number
  goal_name: string
  blocked: number
}

export type TimeInKanbanStatusSectionRow = {
  status_id: number | null
  status_name: string | null
  avg_days: number | null
  task_count: number
}

export type AgingOpenTasksSectionRow = {
  user_id: number | null
  user_name: string | null
  avg_age: number | null
  max_age: number | null
  task_count: number
}

// ===== Quality =====

export type OverdueByAgeSectionRow = {
  bucket_1_3: number
  bucket_4_7: number
  bucket_8_14: number
  bucket_15_plus: number
}

export type CycleTimeHistogramSectionRow = {
  bucket_0_1: number
  bucket_1_3: number
  bucket_3_7: number
  bucket_7_14: number
  bucket_14_30: number
  bucket_30_plus: number
}

export type StaleTasksSectionRow = {
  goal_id: number
  goal_name: string
  stale: number
}

export type CycleTimePerProjectSectionRow = {
  goal_id: number
  goal_name: string
  median_days: number | null
  completed: number
}

// ===== Usage =====

export type StatusDistributionSectionRow = {
  status_id: number | null
  status_name: string | null
  count: number
}

export type ActiveProjectsSectionRow = {
  status_key: 'active' | 'fading' | 'dead' | 'empty'
  count: number
}

// ===== Financial =====

export type IncomeExpenseMonthSectionRow = {
  month: string
  income: number
  expense: number
}

export type IncomeExpensePerProjectSectionRow = {
  goal_id: number
  goal_name: string
  income: number
  expense: number
  net: number
}

export type TopProjectsByAmountSectionRow = {
  goal_id: number
  goal_name: string
  income: number
  expense: number
}
