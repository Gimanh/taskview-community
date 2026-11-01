import { computed } from 'vue'
import { useRoute, useRouter, type LocationQuery } from 'vue-router'
import { format, isValid, parseISO } from 'date-fns'
import type { TaskItem } from '@/types/tasks.types'
import { useGoalPermissions } from '@/composables/useGoalPermissions'

export const CALENDAR_VIEWS = ['month', 'week', 'hours', 'list'] as const
export type CalendarView = typeof CALENDAR_VIEWS[number]

// In the statuses filter, stands for tasks without a status
export const NO_STATUS = 0
// In the unscheduled panel's filters, stand for tasks without an assignee or a priority
export const NO_ASSIGNEE = 0
export const NO_PRIORITY = 0

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

// Whether the unscheduled panel is hidden (?unscheduled=hidden): it's open by default
export function useCalendarUnscheduledPanel() {
  const { route, patchQuery } = useQueryPatch()
  return computed<boolean>({
    get: () => route.query.unscheduled !== 'hidden',
    set: (open) => patchQuery({ unscheduled: open ? undefined : 'hidden' }),
  })
}

function useIdsQuery() {
  const { route, patchQuery } = useQueryPatch()
  return (key: string) => computed<number[]>({
    get: () => idsFromQuery(route.query[key]),
    set: (ids) => patchQuery({ [key]: ids.length ? ids.join(',') : undefined }),
  })
}

export type UnscheduledPriorityFilter = typeof NO_PRIORITY | NonNullable<TaskItem['priorityId']>

function isPriorityFilter(value: number): value is UnscheduledPriorityFilter {
  return [NO_PRIORITY, 1, 2, 3].includes(value)
}

// The unscheduled panel is an inbox for handing out work, so it has its own filters,
// apart from the calendar's (?planAssignees=0,3&planPriorities=3,0)
export function useCalendarUnscheduledFilters() {
  const { patchQuery } = useQueryPatch()
  const idsQuery = useIdsQuery()
  const { canViewTaskPriority, canViewAssignedUsersToTask } = useGoalPermissions()
  const assignees = idsQuery('planAssignees')
  const priorities = idsQuery('planPriorities')

  // A filter on a field the user can't see is ignored, the same as on the server
  const activeAssignees = computed(() => (canViewAssignedUsersToTask.value ? assignees.value : []))
  const activePriorities = computed(() =>
    (canViewTaskPriority.value ? priorities.value.filter(isPriorityFilter) : []))

  const isFiltered = computed(() => activeAssignees.value.length > 0 || activePriorities.value.length > 0)

  function reset() {
    patchQuery({ planAssignees: undefined, planPriorities: undefined })
  }

  function matches(task: Pick<TaskItem, 'assignedUsers' | 'priorityId'>): boolean {
    const ids = activeAssignees.value
    const levels = activePriorities.value
    const assigneeMatches = !ids.length
      || task.assignedUsers.some((id) => ids.includes(id))
      || (!task.assignedUsers.length && ids.includes(NO_ASSIGNEE))
    return assigneeMatches && (!levels.length || levels.includes(task.priorityId ?? NO_PRIORITY))
  }

  return { assignees, priorities, activeAssignees, activePriorities, isFiltered, reset, matches }
}

// Keeps the calendar's filters in the query string too (?assignees=3,5&tags=2&statuses=0,4&weekends=hidden)
export function useCalendarFilters() {
  const { route, patchQuery } = useQueryPatch()
  const idsQuery = useIdsQuery()

  const assignees = idsQuery('assignees')
  const tags = idsQuery('tags')
  const statuses = idsQuery('statuses')

  const hideWeekends = computed<boolean>({
    get: () => route.query.weekends === 'hidden',
    set: (hide) => patchQuery({ weekends: hide ? 'hidden' : undefined }),
  })

  const isFiltered = computed(() =>
    assignees.value.length > 0 || tags.value.length > 0 || statuses.value.length > 0 || hideWeekends.value)

  function reset() {
    patchQuery({ assignees: undefined, tags: undefined, statuses: undefined, weekends: undefined })
  }

  // Filters apply on the client: only the visible period is loaded, so this stays small and instant.
  // Within each filter any selected value matches; different filters must all match.
  function matches(task: Pick<TaskItem, 'assignedUsers' | 'tags' | 'statusId'>): boolean {
    return (!assignees.value.length || task.assignedUsers.some((id) => assignees.value.includes(id)))
      && (!tags.value.length || task.tags.some((id) => tags.value.includes(id)))
      && (!statuses.value.length || statuses.value.includes(task.statusId ?? NO_STATUS))
  }

  return { assignees, tags, statuses, hideWeekends, isFiltered, reset, matches }
}
