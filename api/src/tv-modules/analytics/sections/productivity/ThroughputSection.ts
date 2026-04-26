import type { AnalyticsSection, AnalyticsSeriesPayload } from 'taskview-api'
import type { BuilderContext, SectionBuilder } from '../../types'
import { sectionLocales } from '../locales'

export class ThroughputSection implements SectionBuilder {
  readonly id = 'chart.throughput'
  readonly group = 'productivity' as const
  readonly allowedChartTypes = ['area', 'line', 'bar'] as const
  readonly defaultChartType = 'area' as const
  readonly cacheTtlSec = 300

  private get loc() {
    return sectionLocales[this.id]
  }

  async build(ctx: BuilderContext): Promise<AnalyticsSection | null> {
    if (ctx.accessibleGoalIds.length === 0) return this.empty()

    const bucket = this.pickBucket(ctx.range.from, ctx.range.to)
    const rows = await ctx.repository.fetchThroughput(ctx.accessibleGoalIds, ctx.range, bucket)
    const loc = this.loc

    const payload: AnalyticsSeriesPayload = {
      kind: 'series',
      labels: rows.map(r => r.bucket),
      labelKind: 'date',
      datasets: [
        {
          id: 'created',
          label: loc.datasets!.created,
          values: rows.map(r => Number(r.created)),
          colorToken: 'info',
        },
        {
          id: 'completed',
          label: loc.datasets!.completed,
          values: rows.map(r => Number(r.completed)),
          colorToken: 'success',
        },
      ],
      unit: 'count',
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

  private pickBucket(from: Date, to: Date): 'day' | 'week' | 'month' {
    const days = (to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)
    if (days <= 14) return 'day'
    if (days <= 120) return 'week'
    return 'month'
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
        labelKind: 'date',
        datasets: [],
        unit: 'count',
      },
      generatedAt: new Date().toISOString(),
    }
  }
}
