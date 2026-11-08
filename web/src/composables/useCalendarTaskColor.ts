import type { TaskItem } from '@/types/tasks.types'
import { useGoalsStore } from '@/stores/goals.store'
import { goalHasPermission } from '@/composables/useGoalPermissions'

// Same mapping as the priority dot in TaskItem: 3 high, 2 medium, 1 low
const PRIORITY_COLORS: Record<number, string> = {
  3: 'var(--ui-error)',
  2: 'var(--ui-warning)',
  1: 'var(--ui-success)',
}

const NO_PRIORITY_COLOR = 'var(--ui-text-muted)'

/** A calendar task is tinted by its priority, when the user may see it in the task's project. */
export function useCalendarTaskColor() {
  const goalsStore = useGoalsStore()

  function taskColor(task: Pick<TaskItem, 'priorityId' | 'goalId'>): string {
    const canSeePriority = goalHasPermission(goalsStore.goalMap.get(task.goalId), 'TASK_CAN_WATCH_PRIORITY')
    return (canSeePriority ? PRIORITY_COLORS[task.priorityId] : undefined) ?? NO_PRIORITY_COLOR
  }

  return { taskColor }
}
