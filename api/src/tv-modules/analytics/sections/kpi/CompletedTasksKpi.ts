import type { AnalyticsKpiPayload, AnalyticsSection } from 'taskview-api'
import type { BuilderContext, SectionBuilder } from '../../types'
import { sectionLocales } from '../locales'

export class CompletedTasksKpi implements SectionBuilder {
  readonly id = 'kpi.completed_tasks'
  readonly group = 'kpi' as const
  readonly allowedChartTypes = [] as const
  readonly defaultChartType = null
  readonly cacheTtlSec = 300

  private get loc() {
    return sectionLocales[this.id]
  }

  async build(ctx: BuilderContext): Promise<AnalyticsSection | null> {
    if (ctx.accessibleGoalIds.length === 0) return this.empty()

    const { from, to } = ctx.range
    const windowMs = to.getTime() - from.getTime()
    const prevFrom = new Date(from.getTime() - windowMs)

    const current = await ctx.repository.countCompleted(ctx.accessibleGoalIds, { from, to })
    const prev = await ctx.repository.countCompleted(ctx.accessibleGoalIds, { from: prevFrom, to: from })

    const payload: AnalyticsKpiPayload = {
      kind: 'kpi',
      value: current,
      unit: 'count',
      delta: this.buildDelta(current, prev),
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
    }
  }

  private buildDelta(current: number, prev: number) {
    if (prev === 0 && current === 0) {
      return { value: 0, direction: 'flat' as const, isGood: true }
    }
    if (prev === 0) {
      return { value: 100, direction: 'up' as const, isGood: true }
    }
    const pct = Math.round(((current - prev) / prev) * 100)
    return {
      value: Math.abs(pct),
      direction: pct > 0 ? ('up' as const) : pct < 0 ? ('down' as const) : ('flat' as const),
      isGood: pct >= 0,
    }
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
