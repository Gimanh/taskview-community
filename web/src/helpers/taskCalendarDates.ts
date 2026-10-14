import { addDays, format } from 'date-fns'
import type { Task } from 'taskview-api'

// Which task fields a single-day event was built from, so later writes can target the same field
export type TaskDateShape = 'range' | 'start' | 'end'

export interface TaskCalendarEvent {
  id: string
  title: string
  start: string | Date
  end?: string | Date
  allDay: boolean
  extendedProps: { task: Task; shape: TaskDateShape }
}

const DAY_FORMAT = 'yyyy-MM-dd'

// Dates that carry a time are stored in UTC; date-only values are plain calendar dates
function utcDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time.slice(0, 5)}:00Z`)
}

// The local calendar day a stored date falls on (shifts only when a UTC time comes with it)
function localDay(date: string, time: string | null | undefined): string {
  return time ? format(utcDateTime(date, time), DAY_FORMAT) : date
}

export function isScheduled(task: Pick<Task, 'startDate' | 'endDate'>): boolean {
  return Boolean(task.startDate || task.endDate)
}

export function taskToEvent(task: Task): TaskCalendarEvent | null {
  const { startDate, startTime, endDate, endTime } = task
  if (!startDate && !endDate) return null

  const base = { id: String(task.id), title: task.description }

  if (startDate && endDate) {
    if (startTime && endTime) {
      return { ...base, start: utcDateTime(startDate, startTime), end: utcDateTime(endDate, endTime), allDay: false, extendedProps: { task, shape: 'range' } }
    }
    // Only one side has a time: a timed event can't express that, so show the range as all-day,
    // on the local days the task details show. FullCalendar's all-day end is exclusive.
    const startDay = localDay(startDate, startTime)
    const endExclusive = format(addDays(new Date(`${localDay(endDate, endTime)}T00:00:00`), 1), DAY_FORMAT)
    return { ...base, start: startDay, end: endExclusive, allDay: true, extendedProps: { task, shape: 'range' } }
  }

  const shape: TaskDateShape = startDate ? 'start' : 'end'
  const date = (startDate ?? endDate)!
  const time = startDate ? startTime : endTime
  return time
    ? { ...base, start: utcDateTime(date, time), allDay: false, extendedProps: { task, shape } }
    : { ...base, start: date, allDay: true, extendedProps: { task, shape } }
}

function toLocalDate(value: string | Date): Date {
  return typeof value === 'string' ? new Date(`${value}T00:00:00`) : value
}

/** Whether the event is shown on the given local day (all-day ends are exclusive, like FullCalendar's). */
export function occupiesDay(event: TaskCalendarEvent, day: Date): boolean {
  const start = toLocalDate(event.start)
  const end = event.end ? toLocalDate(event.end) : event.allDay ? addDays(start, 1) : start
  const nextDay = addDays(day, 1)
  return start < nextDay && (end > day || start >= day)
}
