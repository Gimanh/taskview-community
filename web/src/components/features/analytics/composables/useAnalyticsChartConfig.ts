import type { ChartConfiguration, ChartType } from 'chart.js'
import type {
  AnalyticsChartType,
  AnalyticsSection,
  AnalyticsSeriesPayload,
} from 'taskview-api'
import { useI18n } from 'vue-i18n'
import { useAnalyticsLocale } from './useAnalyticsLocale'
import { useAnalyticsTheme } from './useAnalyticsTheme'

type AnyChartConfig = ChartConfiguration<ChartType, (number | null)[], string>

export function useAnalyticsChartConfig() {
  const { pick } = useAnalyticsLocale()
  const { colorFor, paletteForCount, transparentize } = useAnalyticsTheme()
  const { t } = useI18n()

  function build(section: AnalyticsSection, chartType: AnalyticsChartType): AnyChartConfig {
    if (section.payload.kind !== 'series') {
      throw new Error('useAnalyticsChartConfig only supports series payloads')
    }

    const payload = section.payload

    switch (chartType) {
      case 'line':
        return lineOrArea(section, payload, false, false)
      case 'area':
        return lineOrArea(section, payload, true, false)
      case 'stackedArea':
        return lineOrArea(section, payload, true, true)
      case 'bar':
        return barChart(section, payload, 'x', false)
      case 'stackedBar':
        return barChart(section, payload, 'x', true)
      case 'horizontalBar':
        return barChart(section, payload, 'y', payload.datasets.some(d => d.stack))
      case 'donut':
        return donutChart(section, payload)
      case 'histogram':
        return histogramChart(section, payload)
      case 'radar':
        return radarChart(section, payload)
    }
  }

  function radarChart(
    _section: AnalyticsSection,
    payload: AnalyticsSeriesPayload,
  ): AnyChartConfig {
    const MAX_ENTITIES = 5
    const limitedLabels = payload.labels.slice(0, MAX_ENTITIES)

    const axisLabels = payload.datasets.map(ds => pick(ds.label))
    const colors = paletteForCount(limitedLabels.length)

    const newDatasets = limitedLabels.map((label, i) => {
      const color = colors[i]
      return {
        label,
        data: payload.datasets.map(ds => {
          const v = ds.values[i]
          return v === null || v === undefined ? 0 : v
        }),
        backgroundColor: transparentize(color, 0.18),
        borderColor: color,
        pointBackgroundColor: color,
        pointBorderColor: '#ffffff',
        pointRadius: 3,
        pointHoverRadius: 5,
        borderWidth: 2,
      }
    })

    return {
      type: 'radar',
      data: {
        labels: axisLabels,
        datasets: newDatasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' as const },
          tooltip: tooltipConfig(payload),
        },
        scales: {
          r: {
            beginAtZero: true,
            ticks: { display: true, stepSize: 1 },
          },
        },
      } as AnyChartConfig['options'],
    }
  }

  function lineOrArea(
    section: AnalyticsSection,
    payload: AnalyticsSeriesPayload,
    fill: boolean,
    stacked: boolean,
  ): AnyChartConfig {
    return {
      type: 'line' as ChartType,
      data: {
        labels: payload.labels,
        datasets: payload.datasets.map((ds, i) => {
          const color = colorFor(ds.colorToken, i)
          return {
            label: pick(ds.label),
            data: ds.values.map(v => (v === null ? Number.NaN : v)),
            borderColor: color,
            backgroundColor: fill ? transparentize(color, 0.2) : color,
            fill,
            pointRadius: 3,
            pointHoverRadius: 5,
            tension: 0.3,
            stack: stacked ? (ds.stack ?? 'default') : undefined,
          }
        }),
      },
      options: baseOptions(section, payload, { stacked }) as AnyChartConfig['options'],
    }
  }

  function barChart(
    section: AnalyticsSection,
    payload: AnalyticsSeriesPayload,
    indexAxis: 'x' | 'y',
    stacked: boolean,
  ): AnyChartConfig {
    const useMultiColor = payload.datasets.length === 1 && payload.labels.length > 1

    return {
      type: 'bar',
      data: {
        labels: payload.labels,
        datasets: payload.datasets.map((ds, i) => {
          const singleColor = colorFor(ds.colorToken, i)
          const backgroundColor = useMultiColor
            ? paletteForCount(payload.labels.length)
            : singleColor
          return {
            label: pick(ds.label),
            data: ds.values.map(v => (v === null ? Number.NaN : v)),
            backgroundColor,
            borderColor: backgroundColor,
            borderRadius: 4,
            stack: stacked ? (ds.stack ?? 'default') : undefined,
          }
        }),
      },
      options: { ...baseOptions(section, payload, { stacked }), indexAxis } as AnyChartConfig['options'],
    }
  }

  function donutChart(section: AnalyticsSection, payload: AnalyticsSeriesPayload): AnyChartConfig {
    const firstDs = payload.datasets[0]
    const colors = paletteForCount(payload.labels.length)
    return {
      type: 'doughnut',
      data: {
        labels: payload.labels,
        datasets: [
          {
            label: firstDs ? pick(firstDs.label) : pick(section.title),
            data: firstDs?.values.map(v => (v === null ? 0 : v)) ?? [],
            backgroundColor: colors,
            borderWidth: 2,
            borderColor: '#ffffff',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' as const },
          tooltip: tooltipConfig(payload),
        },
      } as AnyChartConfig['options'],
    }
  }

  function histogramChart(
    section: AnalyticsSection,
    payload: AnalyticsSeriesPayload,
  ): AnyChartConfig {
    const cfg = barChart(section, payload, 'x', false)
    const refs = payload.referenceLines ?? []
    const annotations: Record<string, unknown> = {}
    const labelPositions: Array<'start' | 'center' | 'end'> = ['start', 'center', 'end']
    refs.forEach((line, i) => {
      annotations[line.id] = {
        type: 'line',
        scaleID: line.axis === 'x' ? 'x' : 'y',
        value: line.value,
        borderColor: colorFor(line.colorToken ?? 'warning'),
        borderWidth: 2,
        borderDash: [6, 4],
        label: {
          display: true,
          content: pick(line.label),
          position: labelPositions[i % labelPositions.length],
          backgroundColor: colorFor(line.colorToken ?? 'warning'),
          color: '#ffffff',
          padding: { top: 3, bottom: 3, left: 6, right: 6 },
          font: { size: 11, weight: 'bold' },
        },
      }
    })
    cfg.options = {
      ...cfg.options,
      plugins: {
        ...(cfg.options?.plugins ?? {}),
        annotation: { annotations },
      },
    } as AnyChartConfig['options']
    return cfg
  }

  function baseOptions(
    _section: AnalyticsSection,
    payload: AnalyticsSeriesPayload,
    opts: { stacked: boolean },
  ) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index' as const, intersect: false },
      plugins: {
        legend: {
          display: payload.datasets.length > 1,
          position: 'bottom' as const,
        },
        tooltip: tooltipConfig(payload),
      },
      scales: {
        x: {
          stacked: opts.stacked,
          title: payload.xAxisLabel
            ? { display: true, text: pick(payload.xAxisLabel) }
            : undefined,
        },
        y: {
          stacked: opts.stacked,
          beginAtZero: true,
          title: payload.yAxisLabel
            ? { display: true, text: pick(payload.yAxisLabel) }
            : undefined,
          ticks: payload.unit === 'percent' ? { callback: (v: string | number) => `${v}%` } : undefined,
        },
      },
    }
  }

  function tooltipConfig(payload: AnalyticsSeriesPayload) {
    return {
      callbacks: {
        label: (ctx: { dataset: { label?: string }, parsed: number | { y: number } }) => {
          const label = ctx.dataset.label ? `${ctx.dataset.label}: ` : ''
          const value = typeof ctx.parsed === 'number' ? ctx.parsed : ctx.parsed.y
          return `${label}${formatValue(value, payload.unit)}`
        },
      },
    }
  }

  function formatValue(value: number, unit: AnalyticsSeriesPayload['unit']): string {
    if (value === null || Number.isNaN(value)) return '—'
    switch (unit) {
      case 'percent':
        return `${value}%`
      case 'days':
        return `${value} ${t('analytics.units.days')}`
      case 'hours':
        return `${value} ${t('analytics.units.hours')}`
      case 'currency':
        return value.toLocaleString()
      default:
        return String(value)
    }
  }

  return { build, formatValue }
}
