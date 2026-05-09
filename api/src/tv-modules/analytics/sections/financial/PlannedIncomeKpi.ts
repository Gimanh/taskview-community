import type { AnalyticsKpiPayload, AnalyticsSection } from 'taskview-api'
import type { BuilderContext, DrillDownTaskRow, SectionBuilder, SectionDrillDownArg } from '../../types'
import { sectionLocales } from '../locales'

export class PlannedIncomeKpi implements SectionBuilder {
  readonly id = 'kpi.planned_income'
  readonly group = 'financial' as const
  readonly allowedChartTypes = [] as const
  readonly defaultChartType = null
  readonly cacheTtlSec = 600

  private get loc() {
    return sectionLocales[this.id]
  }

  async build(ctx: BuilderContext): Promise<AnalyticsSection | null> {
    if (ctx.accessibleGoalIds.length === 0) return this.empty()

    const value = await ctx.repository.sumPlannedIncome(ctx.accessibleGoalIds)

    const payload: AnalyticsKpiPayload = {
      kind: 'kpi',
      value: Math.round(value),
      unit: 'currency',
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
      drillDown: { kind: 'tasks' },
    }
  }

  async drillDown(ctx: BuilderContext, _arg: SectionDrillDownArg): Promise<DrillDownTaskRow[]> {
    if (ctx.accessibleGoalIds.length === 0) return []
    return ctx.repository.fetchPlannedTasksByType(ctx.accessibleGoalIds, 1)
  }

  private empty(): AnalyticsSection {
    return {
      id: this.id,
      title: this.loc.title,
      group: 'financial',
      allowedChartTypes: [],
      defaultChartType: null,
      payload: { kind: 'kpi', value: 0, unit: 'currency' },
      generatedAt: new Date().toISOString(),
    }
  }
}
