import { addDays, differenceInCalendarDays, format, isWeekend, parseISO, startOfDay, startOfWeek, subDays } from 'date-fns'
import { isTaskDeadlinePassed } from 'taskview-api'
import type { TaskItem } from '@/types/tasks.types'
import type {
  ProjectDashboardAttentionItem,
  ProjectDashboardBucket,
  ProjectDashboardBucketTask,
  ProjectDashboardBuildArgs,
  ProjectDashboardForecast,
  ProjectDashboardForecastArgs,
  ProjectDashboardModel,
  ProjectDashboardPaceWindow,
  ProjectDashboardRibbonArgs,
  ProjectDashboardRibbonCell,
  ProjectDashboardRunwayDay,
  ProjectDashboardSegment,
  ProjectDashboardSprint,
  ProjectDashboardTotals,
  ProjectDashboardWeek,
  ProjectDashboardWorkloadRow,
} from '@/types/project-dashboard.types'

const DATE_KEY = 'yyyy-MM-dd'
const RUNWAY_DAYS = 7
const WEEKS = 12
const ATTENTION_LIMIT = 5
const WORKLOAD_LIMIT = 6
const FORECAST_WEEKS = 4
const NO_STATUS_ID = 0
const PRIORITY_ORDER = [3, 2, 1, 0]

export class ProjectDashboardBuilder {
  private readonly today: Date
  private readonly todayKey: string
  private readonly open: TaskItem[]
  private readonly done: TaskItem[]
  private readonly overdue: TaskItem[]
  private readonly overdueIds: Set<number>

  constructor(private readonly args: ProjectDashboardBuildArgs) {
    this.today = startOfDay(args.now)
    this.todayKey = format(this.today, DATE_KEY)
    this.open = args.tasks.filter((task) => !task.complete)
    this.done = args.tasks.filter((task) => task.complete)
    this.overdue = this.open.filter((task) => this.isOverdue(task))
    this.overdueIds = new Set(this.overdue.map((task) => task.id))
  }

  static ribbon(args: ProjectDashboardRibbonArgs): ProjectDashboardRibbonCell[] {
    const { total, done, overdue } = args.totals
    if (!total) return []
    const cells = Math.min(total, args.maxCells)
    const overdueCells = overdue ? Math.max(1, Math.round((overdue / total) * cells)) : 0
    const doneCells = Math.min(Math.round((done / total) * cells), cells - overdueCells)
    return Array.from({ length: cells }, (_, index) => {
      if (index < doneCells) return 'done'
      return index < doneCells + overdueCells ? 'overdue' : 'open'
    })
  }

  // The open tasks divided by the recent weekly pace; no forecast without open tasks or without a pace
  static forecast(args: ProjectDashboardForecastArgs): ProjectDashboardForecast | null {
    if (!args.open || !args.paceWindow.closed) return null
    const weeklyRate = args.paceWindow.closed / args.paceWindow.weeks
    const weeksLeft = args.open / weeklyRate
    return { date: addDays(args.today, Math.ceil(weeksLeft * 7)), weeklyRate, weeksLeft }
  }

  build(): ProjectDashboardModel {
    const totals = this.totals()
    const sprint = this.sprint()
    const workload = this.workload()
    const paceWindow = this.paceWindow()
    return {
      totals,
      forecast: ProjectDashboardBuilder.forecast({ open: totals.open, paceWindow, today: this.today }),
      paceWindow,
      previousPaceClosed: null,
      runway: this.runway(sprint),
      attention: this.attention(),
      attentionTotal: totals.overdue + totals.dueToday,
      workload,
      hoursTotal: this.args.hoursByUser ? this.args.hoursByUser.reduce((sum, row) => sum + row.totalSeconds, 0) : null,
      statuses: this.statuses(),
      priorities: this.priorities(),
      sprint,
      weeks: this.weeks(),
      completedLast7Days: this.completedSince(subDays(this.args.now, 7)),
    }
  }

  // The tasks behind one column: the most overdue first, the ones due on a day by their time, the completed ones newest first
  bucketTasks(bucket: ProjectDashboardBucket): ProjectDashboardBucketTask[] {
    if (bucket.kind === 'week') {
      return this.done
        .filter((task) => task.dateComplete && this.weekKey(new Date(task.dateComplete)) === bucket.date)
        .sort((a, b) => (b.dateComplete ?? '').localeCompare(a.dateComplete ?? ''))
        .map((task) => ({
          ...this.attentionItem(task),
          completedOn: task.dateComplete ? format(new Date(task.dateComplete), DATE_KEY) : null,
        }))
    }
    const tasks = bucket.kind === 'overdue'
      ? this.overdueByDeadline()
      : this.dueOnTime()
        .filter((task) => this.dueKey(task) === bucket.date)
        .sort((a, b) => (a.endTime ?? '99').localeCompare(b.endTime ?? '99'))
    return tasks.map((task) => ({ ...this.attentionItem(task), completedOn: null }))
  }

  private dueKey(task: TaskItem): string | null {
    return task.endDate ? task.endDate.slice(0, 10) : null
  }

  private isOverdue(task: TaskItem): boolean {
    return isTaskDeadlinePassed({
      endDate: task.endDate,
      endTime: task.endTime,
      now: this.args.now,
      today: this.todayKey,
    })
  }

  private dueOnTime(): TaskItem[] {
    return this.open.filter((task) => !this.overdueIds.has(task.id))
  }

  private totals(): ProjectDashboardTotals {
    const onTime = this.dueOnTime()
    const weekEndKey = format(addDays(startOfWeek(this.today, { weekStartsOn: this.args.weekStart }), 6), DATE_KEY)
    const dueToday = onTime.filter((task) => this.dueKey(task) === this.todayKey).length
    const dueThisWeek = onTime.filter((task) => {
      const key = this.dueKey(task)
      return !!key && key >= this.todayKey && key <= weekEndKey
    }).length
    const total = this.args.tasks.length
    return {
      total,
      done: this.done.length,
      open: this.open.length,
      overdue: this.overdue.length,
      dueToday,
      dueThisWeek,
      undated: this.open.filter((task) => !this.dueKey(task)).length,
      onTrack: this.open.length - this.overdue.length,
      progress: total ? Math.round((this.done.length / total) * 100) : null,
    }
  }

  private completedSince(from: Date): number {
    return this.done.filter((task) => task.dateComplete && new Date(task.dateComplete) >= from).length
  }

  private paceWindow(): ProjectDashboardPaceWindow {
    return { weeks: FORECAST_WEEKS, closed: this.completedSince(subDays(this.args.now, FORECAST_WEEKS * 7)) }
  }

  private runway(sprint: ProjectDashboardSprint | null): ProjectDashboardRunwayDay[] {
    const counts = new Map<string, number>()
    for (const task of this.dueOnTime()) {
      const key = this.dueKey(task)
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    const sprintEnd = sprint?.sprint.endDate.slice(0, 10)
    return Array.from({ length: RUNWAY_DAYS }, (_, index) => {
      const day = addDays(this.today, index)
      const date = format(day, DATE_KEY)
      return {
        date,
        count: counts.get(date) ?? 0,
        isToday: index === 0,
        isWeekend: isWeekend(day),
        isSprintEnd: date === sprintEnd,
      }
    })
  }

  private assigneeEmail(task: TaskItem): string | null {
    const id = task.assignedUsers?.[0]
    return id === undefined ? null : this.args.users?.get(id)?.email ?? null
  }

  private overdueByDeadline(): TaskItem[] {
    return [...this.overdue].sort((a, b) => (this.dueKey(a) ?? '').localeCompare(this.dueKey(b) ?? ''))
  }

  private attentionItem(task: TaskItem): ProjectDashboardAttentionItem {
    return {
      taskId: task.id,
      goalId: task.goalId,
      description: task.description,
      daysLate: this.overdueIds.has(task.id)
        ? differenceInCalendarDays(this.today, parseISO(this.dueKey(task) ?? this.todayKey))
        : -1,
      assigneeEmail: this.assigneeEmail(task),
    }
  }

  private attention(): ProjectDashboardAttentionItem[] {
    const today = this.dueOnTime().filter((task) => this.dueKey(task) === this.todayKey)
    return [...this.overdueByDeadline(), ...today].slice(0, ATTENTION_LIMIT).map((task) => this.attentionItem(task))
  }

  private secondsByEmail(): Map<string, number> | null {
    if (!this.args.hoursByUser) return null
    const seconds = new Map<string, number>()
    for (const row of this.args.hoursByUser) {
      if (row.userEmail) seconds.set(row.userEmail.toLowerCase(), row.totalSeconds)
    }
    return seconds
  }

  private workload(): ProjectDashboardWorkloadRow[] | null {
    const users = this.args.users
    if (!users) return null
    const seconds = this.secondsByEmail()
    const rows = new Map<number | null, ProjectDashboardWorkloadRow>()
    const rowFor = (userId: number | null) => {
      const existing = rows.get(userId)
      if (existing) return existing
      const email = userId === null ? null : users.get(userId)?.email ?? null
      const row: ProjectDashboardWorkloadRow = {
        key: userId === null ? 'unassigned' : String(userId),
        email,
        unassigned: userId === null,
        open: 0,
        overdue: 0,
        seconds: seconds && email ? seconds.get(email.toLowerCase()) ?? 0 : null,
      }
      rows.set(userId, row)
      return row
    }
    for (const task of this.open) {
      const assignees: Array<number | null> = task.assignedUsers?.length ? task.assignedUsers : [null]
      for (const userId of assignees) {
        const row = rowFor(userId)
        row.open += 1
        if (this.overdueIds.has(task.id)) row.overdue += 1
      }
    }
    const unassigned = rows.get(null)
    const assigned = [...rows.values()]
      .filter((row) => !row.unassigned)
      .sort((a, b) => b.open - a.open || b.overdue - a.overdue)
      .slice(0, WORKLOAD_LIMIT)
    return unassigned ? [...assigned, unassigned] : assigned
  }

  private statuses(): ProjectDashboardSegment[] | null {
    const columns = this.args.statuses
    if (!columns) return null
    const counts = new Map<number, number>()
    for (const task of this.open) {
      const known = task.statusId !== null && columns.some((column) => column.id === task.statusId)
      const id = known ? (task.statusId as number) : NO_STATUS_ID
      counts.set(id, (counts.get(id) ?? 0) + 1)
    }
    const segments: ProjectDashboardSegment[] = [...columns]
      .sort((a, b) => a.viewOrder - b.viewOrder)
      .map((column) => ({ id: column.id, name: column.name, count: counts.get(column.id) ?? 0 }))
    segments.unshift({ id: NO_STATUS_ID, name: null, count: counts.get(NO_STATUS_ID) ?? 0 })
    return segments.filter((segment) => segment.count > 0)
  }

  private priorities(): ProjectDashboardSegment[] | null {
    if (!this.args.withPriorities) return null
    return PRIORITY_ORDER
      .map((id) => ({ id, name: null, count: this.open.filter((task) => (task.priorityId ?? 0) === id).length }))
      .filter((segment) => segment.count > 0)
  }

  private sprint(): ProjectDashboardSprint | null {
    const sprint = this.args.sprint
    if (!sprint) return null
    const tasks = this.args.tasks.filter((task) => task.sprintId === sprint.id)
    const done = tasks.filter((task) => task.complete).length
    const start = parseISO(sprint.startDate.slice(0, 10))
    const days = Math.max(differenceInCalendarDays(parseISO(sprint.endDate.slice(0, 10)), start) + 1, 1)
    const day = Math.min(Math.max(differenceInCalendarDays(this.today, start) + 1, 0), days)
    return {
      sprint,
      done,
      total: tasks.length,
      workShare: tasks.length ? done / tasks.length : 0,
      timeShare: day / days,
      day,
      days,
    }
  }

  private weekKey(day: Date): string {
    return format(startOfWeek(day, { weekStartsOn: this.args.weekStart }), DATE_KEY)
  }

  private weeks(): ProjectDashboardWeek[] {
    const currentStart = startOfWeek(this.today, { weekStartsOn: this.args.weekStart })
    const counts = new Map<string, number>()
    for (const task of this.done) {
      if (!task.dateComplete) continue
      const key = this.weekKey(new Date(task.dateComplete))
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return Array.from({ length: WEEKS }, (_, index) => {
      const start = format(addDays(currentStart, (index - WEEKS + 1) * 7), DATE_KEY)
      return { start, count: counts.get(start) ?? 0, isCurrent: index === WEEKS - 1 }
    })
  }
}
