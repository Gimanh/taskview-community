import { type } from 'arktype'
import { sql, type SQL } from 'drizzle-orm'
import type { AnalyticsPeriod } from 'taskview-api'
import { DrillDownMetaArkType, type AnalyticsRange, type DrillDownMeta } from './types'

const MAX_INT32 = 2147483647

export function toIntArraySql(ids: ReadonlyArray<number>): SQL {
  const safe = ids.filter(
    (id): id is number =>
      typeof id === 'number' && Number.isInteger(id) && id > 0 && id < MAX_INT32,
  )
  return sql.raw(`ARRAY[${safe.join(',')}]::int[]`)
}

export function parseDrillDownMeta(raw: string | undefined): DrillDownMeta {
  if (!raw) return {}
  try {
    const result = DrillDownMetaArkType(JSON.parse(raw))
    return result instanceof type.errors ? {} : result
  } catch {
    return {}
  }
}

export function resolveRange(
  period: AnalyticsPeriod,
  from?: string,
  to?: string,
): AnalyticsRange | null {
  const now = new Date()

  if (period === 'custom') {
    if (!from || !to) return null
    const fromDate = new Date(from)
    const toDate = new Date(to)
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) return null
    if (fromDate > toDate) return null
    const maxRangeMs = 365 * 24 * 60 * 60 * 1000
    if (toDate.getTime() - fromDate.getTime() > maxRangeMs) return null
    return { from: fromDate, to: toDate }
  }

  const daysByPeriod: Record<Exclude<AnalyticsPeriod, 'custom'>, number> = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '180d': 180,
    '365d': 365,
  }
  const days = daysByPeriod[period]
  const fromDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  return { from: fromDate, to: now }
}
