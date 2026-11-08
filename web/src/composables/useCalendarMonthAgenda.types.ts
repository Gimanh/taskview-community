import type { Ref } from 'vue'
import type { TaskCalendarEvent } from '@/helpers/taskCalendarDates'

export type CalendarVisibleRange = { start: Date; end: Date }

export type UseCalendarMonthAgendaArgs = {
  events: Ref<TaskCalendarEvent[]>
  visibleRange: Ref<CalendarVisibleRange | undefined>
}
