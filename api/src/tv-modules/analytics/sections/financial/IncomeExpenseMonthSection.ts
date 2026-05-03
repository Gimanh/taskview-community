import type { AnalyticsSection, AnalyticsSeriesPayload } from 'taskview-api'
import type { BuilderContext, SectionBuilder } from '../../types'
import { sectionLocales } from '../locales'

export class IncomeExpenseMonthSection implements SectionBuilder {
  readonly id = 'chart.income_expense_month'
  readonly group = 'financial' as const
  readonly allowedChartTypes = ['bar', 'line', 'area', 'stackedArea'] as const
  readonly defaultChartType = 'bar' as const
  readonly cacheTtlSec = 900

  private get loc() {
    return sectionLocales[this.id]
  }

  async build(ctx: BuilderContext): Promise<AnalyticsSection | null> {
    if (ctx.accessibleGoalIds.length === 0) return this.empty()

    const rows = await ctx.repository.fetchIncomeExpenseMonth(ctx.accessibleGoalIds, ctx.range)
    const loc = this.loc

    const payload: AnalyticsSeriesPayload = {
      kind: 'series',
      labels: rows.map(r => r.month),
      labelKind: 'category',
      datasets: [
        {
          id: 'income',
          label: loc.datasets!.income,
          values: rows.map(r => Number(r.income)),
          colorToken: 'success',
        },
        {
          id: 'expense',
          label: loc.datasets!.expense,
          values: rows.map(r => Number(r.expense)),
          colorToken: 'danger',
        },
      ],
      unit: 'currency',
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
      payload: { kind: 'series', labels: [], labelKind: 'category', datasets: [], unit: 'currency' },
      generatedAt: new Date().toISOString(),
    }
  }
}
