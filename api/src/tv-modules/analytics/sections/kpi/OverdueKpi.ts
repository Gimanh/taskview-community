import type { AnalyticsKpiPayload, AnalyticsSection } from 'taskview-api'
import type { BuilderContext, SectionDrillDownArg, DrillDownTaskRow, SectionBuilder } from '../../types'
import { sectionLocales } from '../locales'

export class OverdueKpi implements SectionBuilder {
  readonly id = 'kpi.overdue'
  readonly group = 'kpi' as const
  readonly allowedChartTypes = [] as const
  readonly defaultChartType = null
  readonly cacheTtlSec = 300

  private get loc() {
    return sectionLocales[this.id]
  }

  async build(ctx: BuilderContext): Promise<AnalyticsSection | null> {
    if (ctx.accessibleGoalIds.length === 0) return this.empty()

    const value = await ctx.repository.countOverdue(ctx.accessibleGoalIds)

    const payload: AnalyticsKpiPayload = {
      kind: 'kpi',
      value,
      unit: 'count',
    }

    return {
      id: this.id,
      title: this.loc.title,
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
    return ctx.repository.fetchOverdueTasks(ctx.accessibleGoalIds)
  }

  private empty(): AnalyticsSection {
    return {
      id: this.id,
      title: this.loc.title,
      group: 'kpi',
      allowedChartTypes: [],
      defaultChartType: null,
      payload: { kind: 'kpi', value: 0, unit: 'count' },
      generatedAt: new Date().toISOString(),
    }
  }
}
