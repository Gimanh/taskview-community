import { computed } from 'vue'
import { useRoute, useRouter, type LocationQuery } from 'vue-router'
import { format, isValid, parseISO } from 'date-fns'

export const CALENDAR_VIEWS = ['month', 'week', 'list'] as const
export type CalendarView = typeof CALENDAR_VIEWS[number]

const DAY_FORMAT = 'yyyy-MM-dd'

function isCalendarView(value: unknown): value is CalendarView {
  return CALENDAR_VIEWS.includes(value as CalendarView)
}

// Keeps the calendar's view and focused date in the query string (?view=week&date=2026-10-08),
// so a reload or a shared link opens the same period
export function useCalendarRouteState(defaultView: CalendarView) {
  const route = useRoute()
  const router = useRouter()

  // route.query only updates once a navigation resolves, so patches made in the same tick
  // (e.g. a view change followed by FullCalendar's datesSet) build on the pending query instead
  let pending: LocationQuery | null = null

  function patchQuery(patch: Record<string, string>) {
    const base = pending ?? route.query
    if (Object.entries(patch).every(([key, value]) => base[key] === value)) return
    const query = { ...base, ...patch }
    pending = query
    router.replace({ query }).finally(() => {
      if (pending === query) pending = null
    })
  }

  const view = computed<CalendarView>({
    get: () => (isCalendarView(route.query.view) ? route.query.view : defaultView),
    set: (value) => patchQuery({ view: value }),
  })

  const date = computed<Date>({
    get: () => {
      const parsed = typeof route.query.date === 'string' ? parseISO(route.query.date) : null
      return parsed && isValid(parsed) ? parsed : new Date()
    },
    set: (value) => patchQuery({ date: format(value, DAY_FORMAT) }),
  })

  return { view, date }
}
