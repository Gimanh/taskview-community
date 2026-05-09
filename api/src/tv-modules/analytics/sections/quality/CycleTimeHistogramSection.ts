import type { AnalyticsSection, AnalyticsSeriesPayload } from 'taskview-api'
import type { BuilderContext, SectionBuilder } from '../../types'
import { sectionLocales } from '../locales'

export class CycleTimeHistogramSection implements SectionBuilder {
  readonly id = 'chart.cycle_time_histogram'
  readonly group = 'quality' as const
  readonly allowedChartTypes = ['bar', 'area'] as const
  readonly defaultChartType = 'bar' as const
  readonly cacheTtlSec = 300

  private get loc() {
    return sectionLocales[this.id]
  }

  async build(ctx: BuilderContext): Promise<AnalyticsSection | null> {
    if (ctx.accessibleGoalIds.length === 0) return this.empty()

    const row = await ctx.repository.fetchCycleTimeHistogram(ctx.accessibleGoalIds, ctx.range)
    const loc = this.loc

    const labels = ['<1д', '1–3д', '3–7д', '7–14д', '14–30д', '30+д']
    const values = [
      Number(row.bucket_0_1),
      Number(row.bucket_1_3),
      Number(row.bucket_3_7),
      Number(row.bucket_7_14),
      Number(row.bucket_14_30),
      Number(row.bucket_30_plus),
    ]

    const payload: AnalyticsSeriesPayload = {
      kind: 'series',
      labels,
      labelKind: 'category',
      datasets: [
        {
          id: 'tasks',
          label: loc.datasets!.tasks,
          values,
          colorToken: 'primary',
        },
      ],
      unit: 'count',
      xAxisLabel: loc.xAxisLabel,
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
