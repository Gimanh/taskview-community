import type { Task } from 'taskview-api'

export type UseCalendarUnscheduledDropArgs = {
  // The panel's element: a task dropped over it loses its dates
  panel: () => HTMLElement | null | undefined
  // Whether a calendar task may be dropped onto the panel; the main screen takes only the panel's project
  accepts?: (task: Task) => boolean
}
