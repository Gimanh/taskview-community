import { computed } from 'vue'
import { useRoute, useRouter, type LocationQuery } from 'vue-router'
import { format, isValid, parseISO } from 'date-fns'

export const CALENDAR_VIEWS = ['month', 'week', 'hours', 'list'] as const
export type CalendarView = typeof CALENDAR_VIEWS[number]

// In the statuses filter, stands for tasks without a status
export const NO_STATUS = 0

const DAY_FORMAT = 'yyyy-MM-dd'

function isCalendarView(value: unknown): value is CalendarView {
  return CALENDAR_VIEWS.includes(value as CalendarView)
}

// route.query only updates once a navigation resolves, so patches made in the same tick
// (e.g. a view change followed by FullCalendar's datesSet) build on the pending query instead.
// Module level: every calendar composable writes to the same query.
let pending: LocationQuery | null = null

function useQueryPatch() {
  const route = useRoute()
  const router = useRouter()

  // An undefined value removes the key
  function patchQuery(patch: Record<string, string | undefined>) {
    const base = pending ?? route.query
    if (Object.entries(patch).every(([key, value]) => base[key] === value)) return
    const query: LocationQuery = { ...base }
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) delete query[key]
      else query[key] = value
    }
    pending = query
    router.replace({ query }).finally(() => {
      if (pending === query) pending = null
    })
  }

  return { route, patchQuery }
}

// Keeps the calendar's view and focused date in the query string (?view=week&date=2026-10-08),
// so a reload or a shared link opens the same period
export function useCalendarRouteState(defaultView: CalendarView) {
  const { route, patchQuery } = useQueryPatch()

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

function idsFromQuery(value: unknown): number[] {
  return typeof value === 'string' && value ? value.split(',').map(Number).filter(Number.isInteger) : []
}

// Keeps the calendar's filters in the query string too (?assignees=3,5&tags=2&statuses=0,4&weekends=hidden)
export function useCalendarFilters() {
  const { route, patchQuery } = useQueryPatch()

  const idsFilter = (key: 'assignees' | 'tags' | 'statuses') => computed<number[]>({
    get: () => idsFromQuery(route.query[key]),
    set: (ids) => patchQuery({ [key]: ids.length ? ids.join(',') : undefined }),
  })

  const assignees = idsFilter('assignees')
  const tags = idsFilter('tags')
  const statuses = idsFilter('statuses')

  const hideWeekends = computed<boolean>({
    get: () => route.query.weekends === 'hidden',
    set: (hide) => patchQuery({ weekends: hide ? 'hidden' : undefined }),
  })

  const isFiltered = computed(() =>
    assignees.value.length > 0 || tags.value.length > 0 || statuses.value.length > 0 || hideWeekends.value)

  function reset() {
    patchQuery({ assignees: undefined, tags: undefined, statuses: undefined, weekends: undefined })
  }

  return { assignees, tags, statuses, hideWeekends, isFiltered, reset }
}
