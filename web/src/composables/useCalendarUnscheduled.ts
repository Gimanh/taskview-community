import { computed, ref, toRef, watch, type Ref } from 'vue'
import { refDebounced, useInfiniteScroll } from '@vueuse/core'
import type { DropInfo, EventDragStopInfo } from '@fullcalendar/vue3'
import { useI18n } from 'vue-i18n'
import type { TaskArgUpdate } from 'taskview-api'
import { useCalendarStore } from '@/stores/calendar.store'
import { useGoalPermissions } from '@/composables/useGoalPermissions'
import { useCalendarUnscheduledFilters } from '@/composables/useCalendarRouteState'
import { useCalendarSlotMinutes } from '@/composables/useCalendarDragStep'
import { clearedTaskDates, droppedTaskDates } from '@/helpers/taskCalendarDates'
import type { CalendarUnscheduledCursor, CalendarUnscheduledQuery } from '@/types/calendar.types'

// The panel's order, the same as the server's: most urgent first (no priority last), then newest
function compareUnscheduled(byPriority: boolean) {
  return (a: CalendarUnscheduledCursor, b: CalendarUnscheduledCursor) =>
    (byPriority ? (b.priorityId ?? 0) - (a.priorityId ?? 0) : 0) || b.id - a.id
}

// The tasks waiting for a date. The server already filtered them; the panel's filters run here too,
// for tasks that changed after they were loaded.
export function useCalendarUnscheduledTasks() {
  const calendarStore = useCalendarStore()
  const { matches, isFiltered } = useCalendarUnscheduledFilters()
  const { canViewTaskPriority } = useGoalPermissions()

  const tasks = computed(() => {
    const compare = compareUnscheduled(canViewTaskPriority.value)
    const query = calendarStore.unscheduledSearch.trim().toLowerCase()
    // A task moved here from the calendar that sorts past the loaded pages waits for its page
    const cursor = calendarStore.unscheduledHasMore ? calendarStore.unscheduledCursor : null
    return calendarStore.unscheduled
      .filter((task) => matches(task)
        && (!query || task.description.toLowerCase().includes(query))
        && (!cursor || compare(task, cursor) <= 0))
      .sort(compare)
  })

  // The search or a filter hides some tasks
  const narrowed = computed(() => Boolean(calendarStore.unscheduledSearch.trim()) || isFiltered.value)

  return { tasks, narrowed }
}

// Reloads the panel from its first page whenever the project, a filter or the search changes
export function useCalendarUnscheduledLoader(goalId: () => number) {
  const calendarStore = useCalendarStore()
  const { activeAssignees, activePriorities } = useCalendarUnscheduledFilters()
  const { canViewTaskPriority } = useGoalPermissions()
  const search = refDebounced(toRef(() => calendarStore.unscheduledSearch.trim()), 300)

  watch(goalId, () => {
    calendarStore.unscheduledSearch = ''
  })

  const query = computed<CalendarUnscheduledQuery>(() => ({
    goalId: goalId(),
    search: search.value,
    assignees: activeAssignees.value,
    priorities: activePriorities.value,
    byPriority: canViewTaskPriority.value,
  }))

  // The filters are rebuilt from the URL on every navigation: only a real change reloads
  watch(query, (value, previous) => {
    if (previous && JSON.stringify(value) === JSON.stringify(previous)) return
    calendarStore.fetchUnscheduled(value)
  }, { immediate: true })
}

// Loads the panel's next page as its list scrolls near the end
export function useCalendarUnscheduledScroll(list: Readonly<Ref<HTMLElement | null>>) {
  const calendarStore = useCalendarStore()
  useInfiniteScroll(list, () => calendarStore.fetchMoreUnscheduled(), {
    distance: 200,
    canLoadMore: () => calendarStore.unscheduledHasMore && !calendarStore.unscheduledLoading,
  })
}

export function useCalendarSchedule() {
  const { t } = useI18n()
  const toast = useToast()
  const calendarStore = useCalendarStore()

  async function saveDates(patch: TaskArgUpdate) {
    if (await calendarStore.updateTaskDates(patch)) return
    toast.add({ title: t('calendar.moveError'), color: 'error' })
  }

  return { saveDates }
}

function pointerPosition(event: MouseEvent | TouchEvent) {
  return 'changedTouches' in event ? event.changedTouches[0] : event
}

// Dragging a task from the panel onto the calendar gives it dates; dragging one from the calendar
// onto the panel clears them. The panel is found by its element, as FullCalendar only knows its own grid.
export function useCalendarUnscheduledDrop(panel: () => HTMLElement | null | undefined) {
  const calendarStore = useCalendarStore()
  const slotMinutes = useCalendarSlotMinutes()
  const { saveDates } = useCalendarSchedule()
  const draggingFromCalendar = ref(false)

  function onDrop(info: DropInfo) {
    const taskId = Number(info.draggedEl.dataset.taskId)
    if (!calendarStore.unscheduled.some((task) => task.id === taskId)) return
    saveDates(droppedTaskDates({ taskId, date: info.date, allDay: info.allDay, minutes: slotMinutes.value }))
  }

  function onEventDragStart() {
    draggingFromCalendar.value = true
  }

  // Dropped outside the grid, FullCalendar puts the event back on its own; clearing the dates then removes it
  function onEventDragStop(info: EventDragStopInfo) {
    draggingFromCalendar.value = false
    const el = panel()
    const point = pointerPosition(info.jsEvent as MouseEvent | TouchEvent)
    if (!el || !point) return
    const rect = el.getBoundingClientRect()
    const overPanel = point.clientX >= rect.left && point.clientX <= rect.right && point.clientY >= rect.top && point.clientY <= rect.bottom
    if (overPanel) saveDates(clearedTaskDates(Number(info.event.id)))
  }

  return { draggingFromCalendar, onDrop, onEventDragStart, onEventDragStop }
}
