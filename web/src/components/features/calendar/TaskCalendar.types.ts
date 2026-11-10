import type { DropInfo, EventDragStartInfo, EventDragStopInfo } from '@fullcalendar/vue3'
import type { TaskArgUpdate } from 'taskview-api'
import type { TaskItem } from '@/types/tasks.types'
import type { CalendarSpan } from '@/helpers/taskCalendarDates'

export type TaskCalendarRange = { start: Date; end: Date }

export type TaskCompleteArgs = {
  task: TaskItem
  complete: boolean
}

export type TaskCalendarProps = {
  tasks: TaskItem[]
  loading: boolean
  // A day click, a drag across days and the "+" button add a task
  canCreate: boolean
  // Whether this task's dates may be changed by dragging it
  canEditTask: (task: TaskItem) => boolean
  hideWeekends: boolean
  // Empty Saturdays and Sundays shrink in the week view. Only where nothing can be dragged:
  // FullCalendar finds the day under the pointer assuming equal-width columns
  collapseEmptyWeekends: boolean
  // Tasks may be dropped onto the calendar from outside it (the unscheduled panel)
  droppable?: boolean
  // Saves dates changed by a drag or a resize; false puts the task back
  saveDates: (patch: TaskArgUpdate) => Promise<boolean>
  // Whether this task may be marked done or reopened from its card
  canCompleteTask: (task: TaskItem) => boolean
  // Saves a task marked done or reopened from its card; false unticks it again
  saveComplete: (args: TaskCompleteArgs) => Promise<boolean>
  // The side slot (the unscheduled panel) is shown; it slides in and out
  sideOpen?: boolean
  // Tint and project label when tasks of several projects mix
  taskProject?: (task: TaskItem) => { name: string; color: string | null } | null
}

export type TaskCalendarEmits = {
  range: [range: TaskCalendarRange]
  add: [span: CalendarSpan]
  drop: [info: DropInfo]
  dragStart: [info: EventDragStartInfo]
  dragStop: [info: EventDragStopInfo]
}
