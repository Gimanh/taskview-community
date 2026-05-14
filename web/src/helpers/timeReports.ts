import axios from 'axios'
import type { TimeReportFilters } from 'taskview-api'
import type { TimeReportsFiltersState } from '@/stores/time-reports.types'

export function resolveTimeReportsErrorKey(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status
    if (status === 403) return 'timeTracking.errors.forbidden'
    if (status === 400) return 'timeTracking.errors.validation'
    if (status === undefined) return 'timeTracking.errors.network'
  }
  return 'timeTracking.errors.generic'
}

export function todayEndOfDayIso(): string {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d.toISOString()
}

export function weekAgoStartOfDayIso(): string {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export function detectTimezone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  }
  catch {
    return undefined
  }
}

export function toTimeReportFilters(state: TimeReportsFiltersState): TimeReportFilters | null {
  if (state.organizationId === null) return null
  return {
    organizationId: state.organizationId,
    goalIds: state.goalIds.length > 0 ? state.goalIds : undefined,
    userId: state.userId ?? undefined,
    from: state.from,
    to: state.to,
    billable: state.billable ?? undefined,
    timezone: detectTimezone(),
  }
}
