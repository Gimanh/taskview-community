import type { CalendarDate } from '@internationalized/date'

export type DateRangeValue = {
  start: CalendarDate | undefined
  end: CalendarDate | undefined
} | null
