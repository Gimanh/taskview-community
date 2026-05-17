import type { AnalyticsDataset, AnalyticsSeriesPayload, LocalizedText } from 'taskview-api'
import type { AmountPerProjectMonthSectionRow } from '../row.types'

export type BuildProjectAmountPayloadArgs = {
  rows: AmountPerProjectMonthSectionRow[]
  xAxisLabel?: LocalizedText
  yAxisLabel?: LocalizedText
}

export function buildProjectAmountPayload(args: BuildProjectAmountPayloadArgs): AnalyticsSeriesPayload {
  const { rows, xAxisLabel, yAxisLabel } = args

  const monthSet = new Set<string>()
  const projectOrder: number[] = []
  const projectNameById = new Map<number, string>()
  const valuesByProject = new Map<number, Map<string, number>>()

  for (const row of rows) {
    monthSet.add(row.month)
    if (!projectNameById.has(row.goal_id)) {
      projectNameById.set(row.goal_id, row.goal_name)
      projectOrder.push(row.goal_id)
    }
    let perMonth = valuesByProject.get(row.goal_id)
    if (!perMonth) {
      perMonth = new Map()
      valuesByProject.set(row.goal_id, perMonth)
    }
    perMonth.set(row.month, Number(row.amount))
  }

  const labels = [...monthSet].sort()

  const datasets: AnalyticsDataset[] = projectOrder.map((goalId) => {
    const perMonth = valuesByProject.get(goalId) ?? new Map<string, number>()
    const name = projectNameById.get(goalId) ?? `#${goalId}`
    return {
      id: `project_${goalId}`,
      label: { ru: name, en: name },
      values: labels.map(month => perMonth.get(month) ?? 0),
      meta: { goalIds: [goalId] },
    }
  })

  return {
    kind: 'series',
    labels,
    labelKind: 'date',
    datasets,
    unit: 'currency',
    xAxisLabel,
    yAxisLabel,
  }
}
