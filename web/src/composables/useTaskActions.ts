import { ref } from 'vue'
import { createSharedComposable } from '@vueuse/core'
import type { Task } from 'taskview-api'
import { useGoalsStore } from '@/stores/goals.store'
import { AllGoalPermissions } from '@/types/goals.types'
import type { TaskActionsMenuRequest, TaskActionsOpenMenuArgs } from './useTaskActions.types'

const _useTaskActions = () => {
  const goalsStore = useGoalsStore()

  const actionTask = ref<Task | null>(null)
  const menuRequest = ref<TaskActionsMenuRequest | null>(null)
  const isMoveDialogOpen = ref(false)
  const isDeleteDialogOpen = ref(false)

  function canDelete(task: Task) {
    return !!goalsStore.goalMap.get(task.goalId)?.permissions[AllGoalPermissions.TASK_CAN_DELETE]
  }

  // Subtasks move only together with their parent task
  function canMove(task: Task) {
    return !task.parentId
  }

  function hasActions(task: Task) {
    return canDelete(task) || canMove(task)
  }

  function openMenu(args: TaskActionsOpenMenuArgs) {
    actionTask.value = args.task
    menuRequest.value = { point: args.point }
  }

  function requestMove(task: Task) {
    actionTask.value = task
    isMoveDialogOpen.value = true
  }

  function requestDelete(task: Task) {
    actionTask.value = task
    isDeleteDialogOpen.value = true
  }

  return {
    actionTask,
    menuRequest,
    isMoveDialogOpen,
    isDeleteDialogOpen,
    canDelete,
    canMove,
    hasActions,
    openMenu,
    requestMove,
    requestDelete,
  }
}

export const useTaskActions = createSharedComposable(_useTaskActions)
