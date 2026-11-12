import type { FirstDayOfWeek, GoalItem, KanbanColumnItem, Sprint, StartDashboardBucket, TimeReportByUserRow } from 'taskview-api'
import type { TaskItem } from '@/types/tasks.types'

export type ProjectDashboardFetchArgs = {
  goalId: GoalItem['id']
  organizationId: number | null
  withSprint: boolean
  withHours: boolean
  hoursFrom: string
  hoursTo: string
  timezone: string
}

export type ProjectDashboardStoreState = {
  goalId: GoalItem['id'] | null
  tasks: TaskItem[]
  sprint: Sprint | null
  hoursByUser: TimeReportByUserRow[]
  loading: boolean
  loaded: boolean
  failed: boolean
}

export type ProjectDashboardUser = {
  id: number
  email: string
}

export type ProjectDashboardBuildArgs = {
  tasks: TaskItem[]
  now: Date
  weekStart: FirstDayOfWeek
  sprint: Sprint | null
  statuses: KanbanColumnItem[] | null
  users: Map<number, ProjectDashboardUser> | null
  hoursByUser: TimeReportByUserRow[] | null
  withPriorities: boolean
}

export type ProjectDashboardTotals = {
  total: number
  done: number
  open: number
  overdue: number
  dueToday: number
  dueThisWeek: number
  undated: number
  onTrack: number
  progress: number | null
}

export type ProjectDashboardForecast = {
  date: Date
  weeklyRate: number
  weeksLeft: number
}

export type ProjectDashboardForecastArgs = {
  open: number
  paceWindow: ProjectDashboardPaceWindow
  today: Date
}

export type ProjectDashboardPaceWindow = {
  weeks: number
  closed: number
}

export type ProjectDashboardRunwayDay = {
  date: string
  count: number
  isToday: boolean
  isWeekend: boolean
  isSprintEnd: boolean
}

export type ProjectDashboardAttentionItem = {
  taskId: number
  goalId: number
  description: string
  // Whole days past the deadline; 0 when it passed earlier today, -1 when the task is due today and still on time
  daysLate: number
  assigneeEmail: string | null
}

// A column of the dashboard the tasks can be listed for
export type ProjectDashboardBucket = {
  kind: StartDashboardBucket
  // The day of a `day` column or the first day of a `week` column, YYYY-MM-DD
  date: string | null
}

export type ProjectDashboardBucketTask = ProjectDashboardAttentionItem & {
  // The day the task was completed on, YYYY-MM-DD; null for open tasks
  completedOn: string | null
}

export type ProjectDashboardListedItem = ProjectDashboardAttentionItem & {
  completedOn?: string | null
}

export type ProjectDashboardTaskStatusArgs = {
  item: ProjectDashboardListedItem
  // The task is due today and still on time
  dueToday: boolean
}

export type ProjectDashboardTaskStatus = {
  label: string
  labelClass: string
  icon: string
  iconClass: string
}

export type ProjectDashboardWorkloadRow = {
  key: string
  // Missing for tasks without an assignee and for an assignee whose email is not known
  email: string | null
  unassigned: boolean
  open: number
  overdue: number
  seconds: number | null
}

export type ProjectDashboardSegment = {
  id: number
  name: string | null
  count: number
}

export type ProjectDashboardSprint = {
  sprint: Sprint
  done: number
  total: number
  workShare: number
  timeShare: number
  day: number
  days: number
}

export type ProjectDashboardWeek = {
  start: string
  count: number
  isCurrent: boolean
}

export type ProjectDashboardModel = {
  totals: ProjectDashboardTotals
  forecast: ProjectDashboardForecast | null
  paceWindow: ProjectDashboardPaceWindow
  // Tasks closed in the window of the same length right before the pace window; null where the trend is not shown
  previousPaceClosed: number | null
  runway: ProjectDashboardRunwayDay[]
  attention: ProjectDashboardAttentionItem[]
  attentionTotal: number
  workload: ProjectDashboardWorkloadRow[] | null
  hoursTotal: number | null
  statuses: ProjectDashboardSegment[] | null
  priorities: ProjectDashboardSegment[] | null
  sprint: ProjectDashboardSprint | null
  weeks: ProjectDashboardWeek[]
  completedLast7Days: number
}

export type ProjectDashboardRibbonArgs = {
  totals: ProjectDashboardTotals
  maxCells: number
}

export type ProjectDashboardHeroVariant = 'forecast' | 'pace'

export type ProjectDashboardRibbonCell = 'done' | 'overdue' | 'open'
