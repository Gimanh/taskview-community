import { type } from 'arktype'
import { sql, type SQL } from 'drizzle-orm'
import { DateTime } from 'luxon'
import type { AnalyticsPeriod } from 'taskview-api'
import { DrillDownMetaArkType, type AnalyticsRange, type DrillDownMeta, type ResolveRangeArgs } from './types'

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

const DAYS_BY_PERIOD: Record<Exclude<AnalyticsPeriod, 'custom' | 'month'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '180d': 180,
  '365d': 365,
}

/**
 * Resolve a period into a concrete UTC instant range, with all calendar
 * boundaries ("this month", a custom day) computed in the *viewer's* IANA
 * timezone — not the server's. The returned Dates are real instants used for
 * SQL filtering; the user-facing 'YYYY-MM-DD' labels come from
 * {@link formatDateInZone} with the same timezone.
 */
export function resolveRange(args: ResolveRangeArgs): AnalyticsRange | null {
  const { period, from, to } = args
  const zone = args.timezone && DateTime.now().setZone(args.timezone).isValid ? args.timezone : 'utc'
  const now = DateTime.now().setZone(zone)

  if (period === 'custom') {
    if (!from || !to) return null
    const fromDt = DateTime.fromISO(from.slice(0, 10), { zone }).startOf('day')
    const toDt = DateTime.fromISO(to.slice(0, 10), { zone }).endOf('day')
    if (!fromDt.isValid || !toDt.isValid) return null
    if (fromDt > toDt) return null
    const maxRangeMs = 366 * 24 * 60 * 60 * 1000
    if (toDt.toMillis() - fromDt.toMillis() > maxRangeMs) return null
    return { from: fromDt.toJSDate(), to: toDt.toJSDate() }
  }

  if (period === 'month') {
    return { from: now.startOf('month').toJSDate(), to: now.toJSDate() }
  }

  return { from: now.minus({ days: DAYS_BY_PERIOD[period] }).toJSDate(), to: now.toJSDate() }
}

/**
 * Format a range boundary as a 'YYYY-MM-DD' calendar day in the viewer's
 * timezone. Slicing a UTC ISO string instead would shift the day across the
 * date line for offset timezones (e.g. a "this month" range rendering from the
 * 31st of the prior month).
 */
export function formatDateInZone(date: Date, timezone?: string): string {
  const dt = DateTime.fromJSDate(date).setZone(timezone && DateTime.fromJSDate(date).setZone(timezone).isValid ? timezone : 'utc')
  return dt.toISODate() as string
}
