import type { AnalyticsSection, AnalyticsSeriesPayload } from 'taskview-api'
import type { BuilderContext, SectionBuilder } from '../../types'
import { sectionLocales } from '../locales'

export class PriorityMixOverTimeSection implements SectionBuilder {
  readonly id = 'chart.priority_mix'
  readonly group = 'productivity' as const
  readonly allowedChartTypes = ['stackedBar', 'stackedArea'] as const
  readonly defaultChartType = 'stackedBar' as const
  readonly cacheTtlSec = 300

  private get loc() {
    return sectionLocales[this.id]
  }

  async build(ctx: BuilderContext): Promise<AnalyticsSection | null> {
    if (ctx.accessibleGoalIds.length === 0) return this.empty()

    const bucket = this.pickBucket(ctx.range.from, ctx.range.to)
    const rows = await ctx.repository.fetchPriorityMix(ctx.accessibleGoalIds, ctx.range, bucket)
    const loc = this.loc

    const payload: AnalyticsSeriesPayload = {
      kind: 'series',
      labels: rows.map(r => r.bucket),
      labelKind: 'date',
      datasets: [
        { id: 'high', label: loc.datasets!.high, values: rows.map(r => Number(r.high)), colorToken: 'danger', stack: 'priority' },
        { id: 'medium', label: loc.datasets!.medium, values: rows.map(r => Number(r.medium)), colorToken: 'warning', stack: 'priority' },
        { id: 'low', label: loc.datasets!.low, values: rows.map(r => Number(r.low)), colorToken: 'info', stack: 'priority' },
        { id: 'none', label: loc.datasets!.none, values: rows.map(r => Number(r.none)), colorToken: 'neutral', stack: 'priority' },
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
      payload: { kind: 'series', labels: [], labelKind: 'date', datasets: [], unit: 'count' },
      generatedAt: new Date().toISOString(),
    }
  }
}
