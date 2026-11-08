import type { Ref } from 'vue'
import type { TaskCalendarEvent } from '@/helpers/taskCalendarDates'
import type { TaskItem } from '@/types/tasks.types'

export type CalendarVisibleRange = { start: Date; end: Date }

export type UseCalendarMonthAgendaArgs = {
  events: Ref<TaskCalendarEvent[]>
  visibleRange: Ref<CalendarVisibleRange | undefined>
  // A dot's color instead of the priority one, e.g. the project's color; undefined keeps the priority
  taskColor?: (task: TaskItem) => string | undefined
}
