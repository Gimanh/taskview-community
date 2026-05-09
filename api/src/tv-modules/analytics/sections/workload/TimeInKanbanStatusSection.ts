import type { AnalyticsSection, AnalyticsSeriesPayload } from 'taskview-api'
import type { BuilderContext, SectionBuilder } from '../../types'
import { sectionLocales } from '../locales'

export class TimeInKanbanStatusSection implements SectionBuilder {
  readonly id = 'chart.time_in_kanban_status'
  readonly group = 'workload' as const
  readonly allowedChartTypes = ['bar'] as const
  readonly defaultChartType = 'bar' as const
  readonly requiresGoalScope = true
  readonly cacheTtlSec = 300

  private get loc() {
    return sectionLocales[this.id]
  }

  async build(ctx: BuilderContext): Promise<AnalyticsSection | null> {
    if (ctx.scope.kind !== 'project') return null
    const goalId = ctx.scope.goalId
    if (!ctx.accessibleGoalIds.includes(goalId)) return null

    const rows = await ctx.repository.fetchTimeInKanbanStatus(goalId, ctx.accessibleGoalIds)
    const loc = this.loc

    const payload: AnalyticsSeriesPayload = {
      kind: 'series',
      labels: rows.map(r => r.status_name ?? 'Без статуса'),
      labelKind: 'category',
      datasets: [
        {
          id: 'avg_days',
          label: loc.datasets!.avg_days,
          values: rows.map(r => r.avg_days === null || r.avg_days === undefined ? 0 : Math.round(Number(r.avg_days) * 10) / 10),
          colorToken: 'info',
        },
      ],
      unit: 'days',
      yAxisLabel: loc.yAxisLabel,
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
    }
  }
}
