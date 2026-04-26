import type { AnalyticsSection, AnalyticsSeriesPayload } from 'taskview-api'
import type { BuilderContext, SectionDrillDownArg, DrillDownTaskRow, SectionBuilder } from '../../types'
import { sectionLocales } from '../locales'

export class AgingOpenTasksSection implements SectionBuilder {
  readonly id = 'chart.aging_open_tasks'
  readonly group = 'workload' as const
  readonly allowedChartTypes = ['bar', 'line', 'area'] as const
  readonly defaultChartType = 'bar' as const
  readonly cacheTtlSec = 300

  private get loc() {
    return sectionLocales[this.id]
  }

  async build(ctx: BuilderContext): Promise<AnalyticsSection | null> {
    if (ctx.accessibleGoalIds.length === 0) return this.empty()

    const rows = await ctx.repository.fetchAgingOpenTasks(ctx.accessibleGoalIds)
    const loc = this.loc
    const userIds = rows.map(r => r.user_id)

    const payload: AnalyticsSeriesPayload = {
      kind: 'series',
      labels: rows.map(r => r.user_name ?? 'Unknown'),
      labelKind: 'category',
      datasets: [
        {
          id: 'avg_age',
          label: loc.datasets!.avg_age,
          values: rows.map(r => r.avg_age === null || r.avg_age === undefined ? 0 : Math.round(Number(r.avg_age) * 10) / 10),
          colorToken: 'warning',
          meta: { userIds },
        },
        {
          id: 'max_age',
          label: loc.datasets!.max_age,
          values: rows.map(r => r.max_age === null || r.max_age === undefined ? 0 : Math.round(Number(r.max_age) * 10) / 10),
          colorToken: 'danger',
          meta: { userIds },
        },
      ],
      unit: 'days',
      xAxisLabel: loc.xAxisLabel,
    }

    return {
      id: this.id,
      title: loc.title,
      description: loc.description,
      help: loc.help,
      group: this.group,
      allowedChartTypes: [...this.allowedChartTypes],
      defaultChartType: this.defaultChartType,
      payload,
      generatedAt: new Date().toISOString(),
      drillDown: { kind: 'tasks' },
    }
  }

  async drillDown(ctx: BuilderContext, arg: SectionDrillDownArg): Promise<DrillDownTaskRow[]> {
    const userIds = arg.meta?.userIds ?? []
    const userId = userIds[arg.index]
    if (!userId || ctx.accessibleGoalIds.length === 0) return []

    return ctx.repository.fetchOpenTasksAssignedTo(ctx.accessibleGoalIds, userId)
  }

  private empty(): AnalyticsSection {
    return {
      id: this.id,
      title: this.loc.title,
      group: this.group,
      allowedChartTypes: [...this.allowedChartTypes],
      defaultChartType: this.defaultChartType,
      payload: { kind: 'series', labels: [], labelKind: 'category', datasets: [], unit: 'days' },
      generatedAt: new Date().toISOString(),
    }
  }
}
