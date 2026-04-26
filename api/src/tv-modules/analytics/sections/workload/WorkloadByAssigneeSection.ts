import type { AnalyticsSection, AnalyticsSeriesPayload } from 'taskview-api'
import type { BuilderContext, SectionDrillDownArg, DrillDownTaskRow, SectionBuilder } from '../../types'
import { sectionLocales } from '../locales'

export class WorkloadByAssigneeSection implements SectionBuilder {
  readonly id = 'chart.workload_by_assignee'
  readonly group = 'workload' as const
  readonly allowedChartTypes = ['stackedBar', 'stackedArea', 'bar', 'line', 'area'] as const
  readonly defaultChartType = 'stackedBar' as const
  readonly cacheTtlSec = 300

  private get loc() {
    return sectionLocales[this.id]
  }

  async build(ctx: BuilderContext): Promise<AnalyticsSection | null> {
    if (ctx.accessibleGoalIds.length === 0) return this.empty()

    const rows = await ctx.repository.fetchWorkloadByAssignee(ctx.accessibleGoalIds)
    const loc = this.loc
    const userIds = rows.map(r => r.user_id)

    const payload: AnalyticsSeriesPayload = {
      kind: 'series',
      labels: rows.map(r => r.user_name ?? 'Unknown'),
      labelKind: 'category',
      datasets: [
        {
          id: 'high',
          label: loc.datasets!.high,
          values: rows.map(r => Number(r.high)),
          colorToken: 'danger',
          stack: 'priority',
          meta: { userIds },
        },
        {
          id: 'medium',
          label: loc.datasets!.medium,
          values: rows.map(r => Number(r.medium)),
          colorToken: 'warning',
          stack: 'priority',
          meta: { userIds },
        },
        {
          id: 'low',
          label: loc.datasets!.low,
          values: rows.map(r => Number(r.low)),
          colorToken: 'info',
          stack: 'priority',
          meta: { userIds },
        },
        {
          id: 'no_priority',
          label: loc.datasets!.no_priority,
          values: rows.map(r => Number(r.no_priority)),
          colorToken: 'neutral',
          stack: 'priority',
          meta: { userIds },
        },
      ],
      unit: 'count',
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

    const priorityByDataset: Record<string, number | 'null'> = {
      high: 3,
      medium: 2,
      low: 1,
      no_priority: 'null',
    }
    const priorityFilter = priorityByDataset[arg.datasetId]

    return ctx.repository.fetchOpenTasksAssignedWithPriority(
      ctx.accessibleGoalIds,
      userId,
      priorityFilter,
    )
  }

  private empty(): AnalyticsSection {
    return {
      id: this.id,
      title: this.loc.title,
      group: this.group,
      allowedChartTypes: [...this.allowedChartTypes],
      defaultChartType: this.defaultChartType,
      payload: {
        kind: 'series',
        labels: [],
        labelKind: 'category',
        datasets: [],
        unit: 'count',
      },
      generatedAt: new Date().toISOString(),
    }
  }
}
