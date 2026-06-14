import { useTasksStore } from '@/stores/tasks.store'
import type { RealtimeEventMap } from '../types'

export function handleRecurrenceInstanceCreated(data: RealtimeEventMap['recurrence.instanceCreated']) {
  useTasksStore().handleRecurrenceInstanceCreated({ goalId: data.goalId, taskId: data.taskId })
}
