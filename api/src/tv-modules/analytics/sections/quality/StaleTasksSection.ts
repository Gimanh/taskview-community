import type { AnalyticsSection, AnalyticsSeriesPayload } from 'taskview-api'
import type { BuilderContext, SectionDrillDownArg, DrillDownTaskRow, SectionBuilder } from '../../types'
import { sectionLocales } from '../locales'

export class StaleTasksSection implements SectionBuilder {
  readonly id = 'chart.stale_tasks'
  readonly group = 'quality' as const
  readonly allowedChartTypes = ['bar'] as const
  readonly defaultChartType = 'bar' as const
  readonly cacheTtlSec = 300

  private get loc() {
    return sectionLocales[this.id]
  }

  async build(ctx: BuilderContext): Promise<AnalyticsSection | null> {
    if (ctx.accessibleGoalIds.length === 0) return this.empty()

    const rows = await ctx.repository.fetchStaleTasks(ctx.accessibleGoalIds)
    const loc = this.loc

    const payload: AnalyticsSeriesPayload = {
      kind: 'series',
      labels: rows.map(r => r.goal_name),
      labelKind: 'category',
      datasets: [
        {
          id: 'stale',
          label: loc.datasets!.stale,
          values: rows.map(r => Number(r.stale)),
          colorToken: 'warning',
          meta: { goalIds: rows.map(r => r.goal_id) },
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
    const goalIds = arg.meta?.goalIds ?? []
    const goalId = goalIds[arg.index]
    if (!goalId || !ctx.accessibleGoalIds.includes(goalId)) return []

    return ctx.repository.fetchStaleTasksInGoal(goalId, ctx.accessibleGoalIds)
  }

  private empty(): AnalyticsSection {
    return {
      id: this.id,
      title: this.loc.title,
      group: this.group,
      allowedChartTypes: [...this.allowedChartTypes],
      defaultChartType: this.defaultChartType,
      payload: { kind: 'series', labels: [], labelKind: 'category', datasets: [], unit: 'count' },
      generatedAt: new Date().toISOString(),
    }
  }
}
