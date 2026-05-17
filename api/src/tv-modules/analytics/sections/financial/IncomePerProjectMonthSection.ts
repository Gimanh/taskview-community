import type { AnalyticsSection } from 'taskview-api'
import type { BuilderContext, SectionBuilder } from '../../types'
import { sectionLocales } from '../locales'
import { buildProjectAmountPayload } from './projectAmountPayload'

export class IncomePerProjectMonthSection implements SectionBuilder {
  readonly id = 'chart.income_per_project_month'
  readonly group = 'financial' as const
  readonly allowedChartTypes = ['line', 'bar'] as const
  readonly defaultChartType = 'line' as const
  readonly cacheTtlSec = 900

  private get loc() {
    return sectionLocales[this.id]
  }

  async build(ctx: BuilderContext): Promise<AnalyticsSection | null> {
    if (ctx.accessibleGoalIds.length === 0) return this.empty()

    const rows = await ctx.repository.fetchAmountPerProjectMonth({
      goalIds: ctx.accessibleGoalIds,
      range: ctx.range,
      transactionType: 1,
    })
    const loc = this.loc
    const payload = buildProjectAmountPayload({
      rows,
      xAxisLabel: loc.xAxisLabel,
      yAxisLabel: loc.yAxisLabel,
    })

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
      payload: { kind: 'series', labels: [], labelKind: 'date', datasets: [], unit: 'currency' },
      generatedAt: new Date().toISOString(),
    }
  }
}
