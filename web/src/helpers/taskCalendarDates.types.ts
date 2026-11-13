import type { CalendarSpan } from './taskCalendarDates'

export type TaskDropArgs = {
  taskId: number
  date: Date
  allDay: boolean
  // How long a task dropped on a time slot lasts
  minutes: number
}

export type CalendarSpanLabelArgs = {
  span: CalendarSpan
  // BCP 47 language tag the label is written in
  locale: string
}
