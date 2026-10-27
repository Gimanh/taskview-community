import { CalendarDate, Time } from '@internationalized/date'

/** A task date as the user sees it: the local day, plus the local time when one is set. */
export type LocalDateTime = { date: CalendarDate; time?: Time }

/** Reads a stored task date. Dates with a time are stored in UTC; date-only values are calendar dates. */
export function fromServerDateTime(date: string | null | undefined, time: string | null | undefined): LocalDateTime | undefined {
  if (!date) return undefined
  if (!time) {
    const [year, month, day] = date.split('-').map(Number)
    return year && month && day ? { date: new CalendarDate(year, month, day) } : undefined
  }
  const local = new Date(`${date}T${time.slice(0, 5)}:00Z`)
  return {
    date: new CalendarDate(local.getFullYear(), local.getMonth() + 1, local.getDate()),
    time: new Time(local.getHours(), local.getMinutes()),
  }
}

/** The stored form of a local date: with a time it is converted to UTC, without one it is kept as is. */
export function toServerDateTime(value: LocalDateTime | undefined): { date: string | null; time: string | null } {
  if (!value) return { date: null, time: null }
  if (!value.time) return { date: value.date.toString(), time: null }
  const { date, time } = value
  const iso = new Date(date.year, date.month - 1, date.day, time.hour, time.minute).toISOString()
  return { date: iso.slice(0, 10), time: `${iso.slice(11, 16)}:00` }
}
