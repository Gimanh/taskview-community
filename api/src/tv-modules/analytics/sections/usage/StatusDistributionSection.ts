import type { AnalyticsSection, AnalyticsSeriesPayload } from 'taskview-api'
import type { BuilderContext, SectionBuilder } from '../../types'
import { sectionLocales } from '../locales'

export class StatusDistributionSection implements SectionBuilder {
  readonly id = 'chart.status_distribution'
  readonly group = 'usage' as const
  readonly allowedChartTypes = ['donut', 'bar'] as const
  readonly defaultChartType = 'donut' as const
  readonly requiresGoalScope = true
  readonly cacheTtlSec = 300

  private get loc() {
    return sectionLocales[this.id]
  }

  async build(ctx: BuilderContext): Promise<AnalyticsSection | null> {
    if (ctx.scope.kind !== 'project') return null
    const goalId = ctx.scope.goalId
    if (!ctx.accessibleGoalIds.includes(goalId)) return null

    const rows = await ctx.repository.fetchStatusDistribution(goalId, ctx.accessibleGoalIds)
    const loc = this.loc

    const topN = 6
    let labels: string[]
    let values: number[]
    if (rows.length > topN) {
      const top = rows.slice(0, topN - 1)
      const rest = rows.slice(topN - 1)
      labels = [...top.map(r => r.status_name ?? 'No status'), 'Другое']
      values = [...top.map(r => Number(r.count)), rest.reduce((sum, r) => sum + Number(r.count), 0)]
    } else {
      labels = rows.map(r => r.status_name ?? 'No status')
      values = rows.map(r => Number(r.count))
    }

    const payload: AnalyticsSeriesPayload = {
      kind: 'series',
      labels,
      labelKind: 'category',
      datasets: [
        {
          id: 'count',
          label: loc.datasets!.count,
          values,
        },
      ],
      unit: 'count',
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
}
