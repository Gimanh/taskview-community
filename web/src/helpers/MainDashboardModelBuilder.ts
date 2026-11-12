import { isWeekend } from 'date-fns'
import { ProjectDashboardBuilder } from '@/helpers/ProjectDashboardBuilder'
import type { MainDashboardBuildArgs } from '@/types/main-dashboard.types'
import type { ProjectDashboardModel, ProjectDashboardWorkloadRow } from '@/types/project-dashboard.types'

const UNASSIGNED_KEY = 'unassigned'

// Turns the counters the server made across all projects into the model the dashboard cards draw
export class MainDashboardModelBuilder {
  constructor(private readonly args: MainDashboardBuildArgs) {}

  build(): ProjectDashboardModel {
    const { data } = this.args
    const paceWindow = { weeks: data.paceWindowWeeks, closed: data.completedInPaceWindow }
    const totals = {
      ...data.totals,
      onTrack: data.totals.open - data.totals.overdue,
      progress: data.totals.total ? Math.round((data.totals.done / data.totals.total) * 100) : null,
    }
    return {
      totals,
      forecast: ProjectDashboardBuilder.forecast({ open: totals.open, paceWindow, today: this.localDay(data.today) }),
      paceWindow,
      previousPaceClosed: data.completedInPreviousPaceWindow,
      runway: data.runway.map((day, index) => ({
        ...day,
        isToday: index === 0,
        isWeekend: isWeekend(this.localDay(day.date)),
        isSprintEnd: false,
      })),
      attention: data.attention.map((task) => ({
        taskId: task.id,
        goalId: task.goalId,
        description: task.description,
        daysLate: task.daysLate,
        assigneeEmail: task.assigneeEmail,
      })),
      attentionTotal: data.attentionTotal,
      workload: this.workload(),
      hoursTotal: this.args.hoursByUser && data.workload
        ? this.args.hoursByUser.reduce((sum, row) => sum + row.totalSeconds, 0)
        : null,
      statuses: null,
      priorities: data.priorities?.map((priority) => ({ id: priority.id, name: null, count: priority.count })) ?? null,
      sprint: null,
      weeks: data.weeks.map((week, index) => ({ ...week, isCurrent: index === data.weeks.length - 1 })),
      completedLast7Days: data.completedLast7Days,
    }
  }

  private localDay(date: string): Date {
    return new Date(`${date}T00:00:00`)
  }

  private workload(): ProjectDashboardWorkloadRow[] | null {
    const rows = this.args.data.workload
    if (!rows) return null
    const seconds = this.args.hoursByUser
      ? new Map(this.args.hoursByUser.flatMap((row) => (row.userEmail ? [[row.userEmail.toLowerCase(), row.totalSeconds]] : [])))
      : null
    return rows.map((row) => ({
      key: row.email?.toLowerCase() ?? UNASSIGNED_KEY,
      email: row.email,
      unassigned: row.email === null,
      open: row.open,
      overdue: row.overdue,
      seconds: seconds && row.email ? seconds.get(row.email.toLowerCase()) ?? 0 : null,
    }))
  }
}
