import type { AnalyticsSection, AnalyticsSeriesPayload } from 'taskview-api'
import type { BuilderContext, SectionDrillDownArg, DrillDownTaskRow, SectionBuilder } from '../../types'
import { sectionLocales } from '../locales'

export class OverdueByAgeSection implements SectionBuilder {
  readonly id = 'chart.overdue_by_age'
  readonly group = 'quality' as const
  readonly allowedChartTypes = ['bar'] as const
  readonly defaultChartType = 'bar' as const
  readonly cacheTtlSec = 300

  private get loc() {
    return sectionLocales[this.id]
  }

  async build(ctx: BuilderContext): Promise<AnalyticsSection | null> {
    if (ctx.accessibleGoalIds.length === 0) return this.empty()

    const row = await ctx.repository.fetchOverdueByAge(ctx.accessibleGoalIds)
    const loc = this.loc

    const payload: AnalyticsSeriesPayload = {
      kind: 'series',
      labels: ['1–3д', '4–7д', '8–14д', '15+'],
      labelKind: 'category',
      datasets: [
        {
          id: 'overdue',
          label: loc.datasets!.overdue,
          values: [
            Number(row.bucket_1_3),
            Number(row.bucket_4_7),
            Number(row.bucket_8_14),
            Number(row.bucket_15_plus),
          ],
          colorToken: 'danger',
        },
      ],
      unit: 'count',
      yAxisLabel: loc.yAxisLabel,
    }

    return {
      id: this.id,
      title: loc.title,
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
    if (ctx.accessibleGoalIds.length === 0) return []

    const ranges: Array<[number, number | null]> = [
      [1, 3],
      [4, 7],
      [8, 14],
      [15, null],
    ]
    const range = ranges[arg.index]
    if (!range) return []

    const [minDays, maxDays] = range
    return ctx.repository.fetchOverdueTasksInRange(ctx.accessibleGoalIds, minDays, maxDays)
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
