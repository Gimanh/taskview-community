import type { AnalyticsSection, AnalyticsSeriesPayload } from 'taskview-api'
import type { BuilderContext, SectionBuilder } from '../../types'
import { sectionLocales } from '../locales'

export class CycleTimePerProjectSection implements SectionBuilder {
  readonly id = 'chart.cycle_time_per_project'
  readonly group = 'quality' as const
  readonly allowedChartTypes = ['bar'] as const
  readonly defaultChartType = 'bar' as const
  readonly cacheTtlSec = 300

  private get loc() {
    return sectionLocales[this.id]
  }

  async build(ctx: BuilderContext): Promise<AnalyticsSection | null> {
    if (ctx.accessibleGoalIds.length === 0) return this.empty()

    const rows = await ctx.repository.fetchCycleTimePerProject(ctx.accessibleGoalIds, ctx.range)
    const loc = this.loc

    const payload: AnalyticsSeriesPayload = {
      kind: 'series',
      labels: rows.map(r => r.goal_name),
      labelKind: 'category',
      datasets: [
        {
          id: 'median',
          label: loc.datasets!.median,
          values: rows.map(r => r.median_days === null || r.median_days === undefined ? 0 : Math.round(Number(r.median_days) * 10) / 10),
          colorToken: 'info',
          meta: { goalIds: rows.map(r => r.goal_id) },
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
    }
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
