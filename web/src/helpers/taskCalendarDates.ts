import { addDays, addHours, format } from 'date-fns'
import type { Task, TaskArgUpdate } from 'taskview-api'

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

/** A span picked on the calendar. All-day ends are exclusive, as FullCalendar reports them. */
export type CalendarSpan = { start: Date; end: Date; allDay: boolean }

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

// A stored date moved by whole local days. A UTC time is shifted in local time,
// so 09:00 stays 09:00 even across a daylight saving change.
function shiftDay(date: string, time: string | null | undefined, days: number): { date: string; time: string | null } {
  if (!time) return { date: format(addDays(new Date(`${date}T00:00:00`), days), DAY_FORMAT), time: null }
  return toStoredDateTime(addDays(utcDateTime(date, time), days))
}

// A moment as the API stores it: UTC date and time
function toStoredDateTime(moment: Date): { date: string; time: string } {
  const iso = moment.toISOString()
  return { date: iso.slice(0, 10), time: `${iso.slice(11, 16)}:00` }
}

/**
 * The dates to save after a task's event is moved or resized by whole days. Times and the fields
 * that are set are kept; a single date only becomes a range when its two ends move apart, and a
 * date-only range shrunk to one day goes back to a single date.
 */
export function shiftTaskDates(task: Task, startDays: number, endDays: number): TaskArgUpdate {
  const { id, startDate, startTime, endDate, endTime } = task

  if (startDate && endDate) {
    const start = shiftDay(startDate, startTime, startDays)
    const end = shiftDay(endDate, endTime, endDays)
    // Resized down to one day: a date-only range becomes a single date (the deadline, as the date
    // picker stores it). Moves keep the range, and a range with times stays, as it holds two times.
    if (startDays !== endDays && start.date === end.date && !start.time && !end.time) {
      return { id, startDate: null, startTime: null, endDate: end.date, endTime: null }
    }
    return { id, startDate: start.date, startTime: start.time, endDate: end.date, endTime: end.time }
  }

  const date = (startDate ?? endDate)!
  const time = startDate ? startTime : endTime
  if (startDays !== endDays) {
    const start = shiftDay(date, time, startDays)
    const end = shiftDay(date, time, endDays)
    return { id, startDate: start.date, startTime: start.time, endDate: end.date, endTime: end.time }
  }

  const moved = shiftDay(date, time, startDays)
  return startDate
    ? { id, startDate: moved.date, startTime: moved.time }
    : { id, endDate: moved.date, endTime: moved.time }
}

/**
 * The dates to save after an event is moved or resized in a time grid, read from where it landed:
 * a time slot sets the time, the all-day row drops it. A single date keeps its field unless it was
 * resized, which turns it into a range.
 */
export function eventToTaskDates(
  task: Task,
  shape: TaskDateShape,
  event: { start: Date; end: Date | null; allDay: boolean },
  resized: boolean,
): TaskArgUpdate {
  const { id } = task
  const stored = (moment: Date) => (event.allDay ? { date: format(moment, DAY_FORMAT), time: null } : toStoredDateTime(moment))
  const start = stored(event.start)

  if (shape !== 'range' && !resized) {
    return shape === 'start'
      ? { id, startDate: start.date, startTime: start.time }
      : { id, endDate: start.date, endTime: start.time }
  }

  // All-day ends are exclusive. Without an end, FullCalendar draws a timed event one hour long.
  const endMoment = event.end
    ? (event.allDay ? addDays(event.end, -1) : event.end)
    : (event.allDay ? event.start : addHours(event.start, 1))
  const end = stored(endMoment)
  // Dropped on one day of the all-day row: a single date, like a date-only range shrunk in the day views
  if (event.allDay && start.date === end.date) {
    return { id, startDate: null, startTime: null, endDate: end.date, endTime: null }
  }
  return { id, startDate: start.date, startTime: start.time, endDate: end.date, endTime: end.time }
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
