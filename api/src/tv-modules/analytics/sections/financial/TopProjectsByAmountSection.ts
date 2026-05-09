import type { AnalyticsSection, AnalyticsSeriesPayload } from 'taskview-api'
import type { BuilderContext, SectionBuilder } from '../../types'
import { sectionLocales } from '../locales'

export class TopProjectsByAmountSection implements SectionBuilder {
  readonly id = 'chart.top_projects_by_amount'
  readonly group = 'financial' as const
  readonly allowedChartTypes = ['stackedBar', 'stackedArea'] as const
  readonly defaultChartType = 'stackedBar' as const
  readonly cacheTtlSec = 900

  private get loc() {
    return sectionLocales[this.id]
  }

  async build(ctx: BuilderContext): Promise<AnalyticsSection | null> {
    if (ctx.accessibleGoalIds.length === 0) return this.empty()

    const rows = await ctx.repository.fetchTopProjectsByAmount(ctx.accessibleGoalIds)
    const loc = this.loc
    const goalIds = rows.map(r => r.goal_id)

    const payload: AnalyticsSeriesPayload = {
      kind: 'series',
      labels: rows.map(r => r.goal_name),
      labelKind: 'category',
      datasets: [
        {
          id: 'income',
          label: loc.datasets!.income,
          values: rows.map(r => Number(r.income)),
          colorToken: 'success',
          stack: 'amount',
          meta: { goalIds },
        },
        {
          id: 'expense',
          label: loc.datasets!.expense,
          values: rows.map(r => Number(r.expense)),
          colorToken: 'danger',
          stack: 'amount',
          meta: { goalIds },
        },
      ],
      unit: 'currency',
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
      payload: { kind: 'series', labels: [], labelKind: 'category', datasets: [], unit: 'currency' },
      generatedAt: new Date().toISOString(),
    }
  }
}
