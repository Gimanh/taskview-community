import type { AnalyticsSection, AnalyticsSeriesPayload } from 'taskview-api'
import type { BuilderContext, SectionDrillDownArg, DrillDownTaskRow, SectionBuilder } from '../../types'
import { sectionLocales } from '../locales'

type StatusKey = 'active' | 'fading' | 'dead' | 'empty'

const STATUS_ORDER: readonly StatusKey[] = ['active', 'fading', 'dead', 'empty']

export class ActiveProjectsSection implements SectionBuilder {
  readonly id = 'chart.active_projects'
  readonly group = 'usage' as const
  readonly allowedChartTypes = ['bar', 'donut'] as const
  readonly defaultChartType = 'bar' as const
  readonly cacheTtlSec = 600

  private get loc() {
    return sectionLocales[this.id]
  }

  async build(ctx: BuilderContext): Promise<AnalyticsSection | null> {
    if (ctx.accessibleGoalIds.length === 0) return this.empty()

    const rows = await ctx.repository.fetchActiveProjects(ctx.accessibleGoalIds)
    const loc = this.loc
    const countByStatus = new Map(rows.map(r => [r.status_key, Number(r.count)]))
    const labelTexts = STATUS_ORDER.map(key => loc.labels![key])

    const payload: AnalyticsSeriesPayload = {
      kind: 'series',
      labels: labelTexts.map(l => l.ru),
      labelTexts,
      labelKind: 'category',
      datasets: [
        {
          id: 'count',
          label: loc.datasets!.count,
          values: STATUS_ORDER.map(key => countByStatus.get(key) ?? 0),
          meta: { statusKeys: STATUS_ORDER },
        },
      ],
      unit: 'count',
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
      drillDown: { kind: 'tasks' },
    }
  }

  async drillDown(ctx: BuilderContext, arg: SectionDrillDownArg): Promise<DrillDownTaskRow[]> {
    if (ctx.accessibleGoalIds.length === 0) return []

    const statusKeys = arg.meta?.statusKeys ?? []
    const statusKey = statusKeys[arg.index]
    if (!statusKey || statusKey === 'empty') return []

    return ctx.repository.fetchOpenTasksInActiveProjects(ctx.accessibleGoalIds, statusKey)
  }

  private empty(): AnalyticsSection {
    return {
      id: this.id,
      title: this.loc.title,
      group: this.group,
      allowedChartTypes: [...this.allowedChartTypes],
      defaultChartType: this.defaultChartType,
      payload: { kind: 'series', labels: [], labelKind: 'category', datasets: [], unit: 'count' },
      generatedAt: new Date().toISOString(),
    }
  }
}
