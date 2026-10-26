import type { CalendarDate, Time } from '@internationalized/date'

export type DateRangeValue = {
  start: CalendarDate | undefined
  end: CalendarDate | undefined
  // Local times; unset means the date has no time
  startTime?: Time
  endTime?: Time
} | null
