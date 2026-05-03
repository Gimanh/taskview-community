import type { AnalyticsSection, AnalyticsSeriesPayload } from 'taskview-api'
import type { BuilderContext, SectionDrillDownArg, DrillDownTaskRow, SectionBuilder } from '../../types'
import { sectionLocales } from '../locales'

type StatusKey = 'active' | 'fading' | 'dead' | 'empty'

const STATUS_LABEL_RU: Record<StatusKey, string> = {
  active: 'Активен',
  fading: 'Затухает',
  dead: 'Мёртв',
  empty: 'Без задач',
}

const COLOR_BY_STATUS: Record<StatusKey, 'success' | 'warning' | 'danger' | 'neutral'> = {
  active: 'success',
  fading: 'warning',
  dead: 'danger',
  empty: 'neutral',
}

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

    const payload: AnalyticsSeriesPayload = {
      kind: 'series',
      labels: rows.map(r => STATUS_LABEL_RU[r.status_key]),
      labelKind: 'category',
      datasets: [
        {
          id: 'count',
          label: loc.datasets!.count,
          values: rows.map(r => Number(r.count)),
          meta: { statusKeys: rows.map(r => r.status_key) },
        },
      ],
      unit: 'count',
      yAxisLabel: loc.yAxisLabel,
    }

    const firstRow = rows[0]
    if (firstRow) {
      payload.datasets[0].colorToken = COLOR_BY_STATUS[firstRow.status_key] ?? 'primary'
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
