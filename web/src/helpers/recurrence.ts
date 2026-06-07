import { RRule, Weekday } from 'rrule'
import type { RecurrenceFormValue } from '@/types/recurrence.types'

const FREQ_TO_RRULE = {
  daily: RRule.DAILY,
  weekly: RRule.WEEKLY,
  monthly: RRule.MONTHLY,
  yearly: RRule.YEARLY,
} as const

const RRULE_TO_FREQ: Record<number, RecurrenceFormValue['frequency']> = {
  [RRule.DAILY]: 'daily',
  [RRule.WEEKLY]: 'weekly',
  [RRule.MONTHLY]: 'monthly',
  [RRule.YEARLY]: 'yearly',
}

/** JS Date.getDay() (0=Sun) → rrule weekday (0=Mon). */
export function jsDayToRruleWeekday(jsDay: number): number {
  return (jsDay + 6) % 7
}

export function defaultRecurrenceForm(dtstart: Date): RecurrenceFormValue {
  return {
    frequency: 'weekly',
    interval: 1,
    weekdays: [jsDayToRruleWeekday(dtstart.getUTCDay())],
    monthlyMode: 'dayOfMonth',
    ends: 'never',
    count: 10,
    untilDate: null,
    notifyOnOccurrence: false,
  }
}

export function buildRruleString(args: { form: RecurrenceFormValue; dtstart: Date }): string {
  const { form, dtstart } = args
  const options: ConstructorParameters<typeof RRule>[0] = {
    freq: FREQ_TO_RRULE[form.frequency],
    interval: form.interval > 1 ? form.interval : undefined,
  }
  if (form.frequency === 'weekly' && form.weekdays.length > 0) {
    options.byweekday = [...form.weekdays].sort((a, b) => a - b)
  }
  if (form.frequency === 'monthly') {
    options.bymonthday = form.monthlyMode === 'lastDay' ? -1 : dtstart.getUTCDate()
  }
  if (form.ends === 'after') {
    options.count = form.count
  } else if (form.ends === 'onDate' && form.untilDate) {
    // Floating wall-clock UNTIL: components are local, the Z suffix is technical (see backend RecurrenceParser).
    options.until = new Date(`${form.untilDate}T23:59:59Z`)
  }
  return RRule.optionsToString({ ...new RRule(options).origOptions }).replace(/^RRULE:/, '')
}

export function parseRruleToForm(args: { rrule: string; dtstart: Date; notifyOnOccurrence: boolean }): RecurrenceFormValue {
  const form = defaultRecurrenceForm(args.dtstart)
  form.notifyOnOccurrence = args.notifyOnOccurrence
  const options = RRule.parseString(args.rrule)
  if (options.freq !== undefined && RRULE_TO_FREQ[options.freq]) {
    form.frequency = RRULE_TO_FREQ[options.freq]
  }
  form.interval = options.interval ?? 1
  if (options.byweekday) {
    const days = Array.isArray(options.byweekday) ? options.byweekday : [options.byweekday]
    form.weekdays = days
      .map((d) => {
        if (typeof d === 'number') return d
        if (typeof d === 'string') return Weekday.fromStr(d).weekday
        return d.weekday
      })
      .sort((a, b) => a - b)
  }
  const monthday = Array.isArray(options.bymonthday) ? options.bymonthday[0] : options.bymonthday
  if (monthday === -1) form.monthlyMode = 'lastDay'
  if (options.count) {
    form.ends = 'after'
    form.count = options.count
  } else if (options.until) {
    form.ends = 'onDate'
    form.untilDate = options.until.toISOString().slice(0, 10)
  }
  return form
}

/** Next N occurrence dates ('YYYY-MM-DD') for the live preview. */
export function previewOccurrences(args: { rrule: string; dtstart: Date; limit: number }): string[] {
  try {
    const rule = new RRule({ ...RRule.parseString(args.rrule), dtstart: args.dtstart })
    return rule.all((_, index) => index < args.limit).map((d) => d.toISOString().slice(0, 10))
  } catch {
    return []
  }
}

/**
 * Wall-clock dtstart for a task: its start date+time, or today when unset.
 * Timed values are stored in UTC, while the series is anchored to the user's
 * wall clock (the browser timezone is what gets sent as the rule timezone) —
 * so the stored instant is converted to local components first.
 */
export function dtstartForTask(args: { startDate: string | null; startTime: string | null }): { date: Date; iso: string } {
  let iso: string
  if (args.startDate && args.startTime?.match(/^\d{2}:\d{2}/)) {
    const instant = new Date(`${args.startDate}T${args.startTime.slice(0, 5)}:00Z`)
    iso = `${formatLocalDate(instant)}T${formatLocalTime(instant)}`
  } else if (args.startDate) {
    iso = `${args.startDate}T00:00:00`
  } else {
    iso = `${formatLocalDate(new Date())}T00:00:00`
  }
  return { date: new Date(`${iso}Z`), iso }
}

function formatLocalDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function formatLocalTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:00`
}
