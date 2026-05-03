import type { AnalyticsKpiPayload, AnalyticsSection } from 'taskview-api'
import type { BuilderContext, SectionBuilder } from '../../types'
import { sectionLocales } from '../locales'

export class AmountCoverageKpi implements SectionBuilder {
  readonly id = 'kpi.amount_coverage'
  readonly group = 'financial' as const
  readonly allowedChartTypes = [] as const
  readonly defaultChartType = null
  readonly cacheTtlSec = 900

  private get loc() {
    return sectionLocales[this.id]
  }

  async build(ctx: BuilderContext): Promise<AnalyticsSection | null> {
    if (ctx.accessibleGoalIds.length === 0) return this.empty()

    const { total, withAmount } = await ctx.repository.amountCoverage(ctx.accessibleGoalIds)
    const percent = total === 0 ? 0 : Math.round((withAmount / total) * 100)

    const payload: AnalyticsKpiPayload = {
      kind: 'kpi',
      value: percent,
      unit: 'percent',
    }

    return {
      id: this.id,
      title: this.loc.title,
      description: this.loc.description,
      help: this.loc.help,
      group: this.group,
      allowedChartTypes: [],
      defaultChartType: null,
      payload,
      generatedAt: new Date().toISOString(),
    }
  }

  private empty(): AnalyticsSection {
    return {
      id: this.id,
      title: this.loc.title,
      group: this.group,
      allowedChartTypes: [],
      defaultChartType: null,
      payload: { kind: 'kpi', value: 0, unit: 'percent' },
      generatedAt: new Date().toISOString(),
    }
  }
}
