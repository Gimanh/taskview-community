import type { Ref } from 'vue'
import type { GoalItem } from 'taskview-api'
import type { TaskItem } from '@/types/tasks.types'
import type { UnscheduledPriorityFilter } from '@/composables/useCalendarRouteState'

// What the unscheduled panel shows: the server filters and pages it, so every page matches
export type CalendarUnscheduledQuery = {
  goalId: GoalItem['id']
  search: string
  // 0 stands for tasks without an assignee / a priority
  assignees: number[]
  priorities: UnscheduledPriorityFilter[]
  // Most urgent first; without access to priorities, newest first
  byPriority: boolean
}

// The last task the server returned: the next page starts after it
export type CalendarUnscheduledCursor = Pick<TaskItem, 'id' | 'priorityId'>

export type CalendarCardTitleLinesArgs = {
  card: Readonly<Ref<HTMLElement | null>>
  title: Readonly<Ref<HTMLElement | null>>
  // Only a tall event in the hours view wraps its title to the height
  enabled: Readonly<Ref<boolean>>
}
