import type { TaskItem } from '@/types/tasks.types'

/** Days as YYYY-MM-DD, both inclusive */
export type MainCalendarPeriod = {
  from: string
  to: string
}

export type MainCalendarState = {
  tasks: TaskItem[]
  loading: boolean
  period: MainCalendarPeriod | null
}
