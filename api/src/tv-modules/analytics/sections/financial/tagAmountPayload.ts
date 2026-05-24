import type { AnalyticsDataset, AnalyticsSeriesPayload, LocalizedText } from 'taskview-api'
import type { AmountPerTagMonthSectionRow } from '../row.types'
import { UNTAGGED_TAG_ID } from '../../types'

const UNTAGGED_LABEL: LocalizedText = { ru: 'Без тегов', en: 'Untagged' }

export type BuildTagAmountPayloadArgs = {
  rows: AmountPerTagMonthSectionRow[]
  xAxisLabel?: LocalizedText
  yAxisLabel?: LocalizedText
}

export function buildTagAmountPayload(args: BuildTagAmountPayloadArgs): AnalyticsSeriesPayload {
  const { rows, xAxisLabel, yAxisLabel } = args

  const monthSet = new Set<string>()
  const tagOrder: number[] = []
  const tagNameById = new Map<number, LocalizedText>()
  const valuesByTag = new Map<number, Map<string, number>>()

  for (const row of rows) {
    monthSet.add(row.month)
    if (!tagNameById.has(row.tag_id)) {
      tagNameById.set(
        row.tag_id,
        row.tag_id === UNTAGGED_TAG_ID ? UNTAGGED_LABEL : { ru: row.tag_name, en: row.tag_name },
      )
      tagOrder.push(row.tag_id)
    }
    let perMonth = valuesByTag.get(row.tag_id)
    if (!perMonth) {
      perMonth = new Map()
      valuesByTag.set(row.tag_id, perMonth)
    }
    perMonth.set(row.month, Number(row.amount))
  }

  const labels = [...monthSet].sort()

  const datasets: AnalyticsDataset[] = tagOrder.map((tagId) => {
    const perMonth = valuesByTag.get(tagId) ?? new Map<string, number>()
    const isUntagged = tagId === UNTAGGED_TAG_ID
    return {
      id: isUntagged ? 'untagged' : `tag_${tagId}`,
      label: tagNameById.get(tagId) ?? { ru: '', en: '' },
      values: labels.map(month => perMonth.get(month) ?? 0),
      colorToken: isUntagged ? 'neutral' : undefined,
      meta: isUntagged ? { untagged: true } : { tagIds: [tagId] },
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
