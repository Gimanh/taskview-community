import type { AnalyticsKpiPayload, AnalyticsSection } from 'taskview-api'
import type { BuilderContext, SectionBuilder } from '../../types'
import { sectionLocales } from '../locales'

export class CycleTimeKpi implements SectionBuilder {
  readonly id = 'kpi.cycle_time'
  readonly group = 'kpi' as const
  readonly allowedChartTypes = [] as const
  readonly defaultChartType = null
  readonly cacheTtlSec = 300

  private get loc() {
    return sectionLocales[this.id]
  }

  async build(ctx: BuilderContext): Promise<AnalyticsSection | null> {
    if (ctx.accessibleGoalIds.length === 0) return this.empty()

    const median = await ctx.repository.medianCycleTime(ctx.accessibleGoalIds, ctx.range)
    const value = median === null ? 0 : Math.round(median * 10) / 10

    const payload: AnalyticsKpiPayload = {
      kind: 'kpi',
      value,
      unit: 'days',
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
      group: 'kpi',
      allowedChartTypes: [],
      defaultChartType: null,
      payload: { kind: 'kpi', value: 0, unit: 'days' },
      generatedAt: new Date().toISOString(),
    }
  }
}
