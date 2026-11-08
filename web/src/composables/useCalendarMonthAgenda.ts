import { computed, ref } from 'vue'
import { addDays, eachDayOfInterval, format, isSameMonth, startOfDay, startOfMonth } from 'date-fns'
import { occupiesDay, type TaskCalendarEvent } from '@/helpers/taskCalendarDates'
import { useCalendarTaskColor } from '@/composables/useCalendarTaskColor'
import type { UseCalendarMonthAgendaArgs } from './useCalendarMonthAgenda.types'

const DAY_FORMAT = 'yyyy-MM-dd'
const MAX_DOTS = 3

function eventStart(event: TaskCalendarEvent): number {
  return new Date(event.start).getTime()
}

/** The phone month: a grid with a dot per task and, below it, the tasks of the day picked in it. */
export function useCalendarMonthAgenda(args: UseCalendarMonthAgendaArgs) {
  const { events, visibleRange } = args
  const { taskColor: priorityColor } = useCalendarTaskColor()
  const taskColor = (task: TaskCalendarEvent['extendedProps']['task']) => args.taskColor?.(task) ?? priorityColor(task)

  const selectedDay = ref(startOfDay(new Date()))

  const dotsByDay = computed(() => {
    const dots = new Map<string, string[]>()
    const range = visibleRange.value
    if (!range) return dots
    for (const day of eachDayOfInterval({ start: range.start, end: addDays(range.end, -1) })) {
      const colors = events.value
        .filter((event) => occupiesDay(event, day))
        .slice(0, MAX_DOTS)
        .map((event) => taskColor(event.extendedProps.task))
      if (colors.length) dots.set(format(day, DAY_FORMAT), colors)
    }
    return dots
  })

  // All-day tasks first, then by start time
  const selectedDayEvents = computed(() => events.value
    .filter((event) => occupiesDay(event, selectedDay.value))
    .sort((a, b) => Number(b.allDay) - Number(a.allDay) || eventStart(a) - eventStart(b)))

  function selectDay(day: Date) {
    selectedDay.value = startOfDay(day)
  }

  /** Moving to another month picks today there, or its first day. */
  function keepInMonth(month: Date) {
    if (isSameMonth(selectedDay.value, month)) return
    const today = startOfDay(new Date())
    selectedDay.value = isSameMonth(today, month) ? today : startOfMonth(month)
  }

  function isSelected(day: Date): boolean {
    return format(day, DAY_FORMAT) === format(selectedDay.value, DAY_FORMAT)
  }

  function dotsOf(day: Date): string[] {
    return dotsByDay.value.get(format(day, DAY_FORMAT)) ?? []
  }

  return { selectedDay, selectedDayEvents, selectDay, keepInMonth, isSelected, dotsOf }
}
