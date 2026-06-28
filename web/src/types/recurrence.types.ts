export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly'
export type RecurrenceEndsMode = 'never' | 'after' | 'onDate'
export type RecurrenceMonthlyMode = 'dayOfMonth' | 'lastDay'

export type RecurrenceFormValue = {
  frequency: RecurrenceFrequency
  /** 'YYYY-MM-DD' wall-clock start date of the series. */
  startDate: string
  interval: number
  /** rrule weekday numbers: 0=Mon … 6=Sun. Used when frequency is 'weekly'. */
  weekdays: number[]
  monthlyMode: RecurrenceMonthlyMode
  ends: RecurrenceEndsMode
  count: number
  /** 'YYYY-MM-DD', used when ends is 'onDate'. */
  untilDate: string | null
  /** 'HH:mm' wall-clock time of the series, or null for a date-only series. */
  time: string | null
  notifyOnOccurrence: boolean
}
