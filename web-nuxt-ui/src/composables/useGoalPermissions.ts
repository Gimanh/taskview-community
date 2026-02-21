import { computed, provide, inject, type ComputedRef, type InjectionKey, type Ref } from 'vue'
import { useGoalsStore } from '@/stores/goals.store'
import { AllGoalPermissions } from '@/types/goals.types'
import type { GoalItem } from 'taskview-api'

type PermissionName = (keyof typeof AllGoalPermissions);

const GOAL_CONTEXT_KEY: InjectionKey<Ref<GoalItem | null | undefined>> = Symbol('goalPermissionsContext')

export function provideGoalPermissions(goal: Ref<GoalItem | null | undefined>) {
  provide(GOAL_CONTEXT_KEY, goal)
}

function hasPermission(goal: GoalItem | null | undefined, perm: PermissionName): boolean {
  return !!goal?.permissions[AllGoalPermissions[perm]]
}

export function useGoalPermissionsFor(goalRef: Ref<GoalItem | null>) {
  const can = (perm: PermissionName) => computed(() => hasPermission(goalRef.value, perm))

  return {
    canDeleteGoal: can('GOAL_CAN_DELETE'),
    canEditGoal: can('GOAL_CAN_EDIT'),
    canManageUsers: can('GOAL_CAN_MANAGE_USERS'),
    canViewKanban: computed(() => hasPermission(goalRef.value, 'KANBAN_CAN_VIEW') || hasPermission(goalRef.value, 'KANBAN_CAN_MANAGE')),
    canViewGraph: computed(() => hasPermission(goalRef.value, 'GRAPH_CAN_VIEW') || hasPermission(goalRef.value, 'GRAPH_CAN_MANAGE')),
  }
}

export const useGoalPermissions = () => {
  const injectedGoal = inject(GOAL_CONTEXT_KEY, null)
  const goalsStore = useGoalsStore()
  const goal = computed(() => injectedGoal?.value ?? goalsStore.selectedGoal ?? null)

  const cache = {} as Record<PermissionName, ComputedRef<boolean>>

  const permissions = new Proxy({} as Record<PermissionName, boolean>, {
    get(_, prop: PermissionName) {
      if (!cache[prop]) {
        cache[prop] = computed(() => {
          return !!goal.value?.permissions[AllGoalPermissions[prop]]
        })
      }
      return cache[prop].value
    },
  })

  const canDeleteGoal = computed(() => permissions.GOAL_CAN_DELETE)
  const canEditGoal = computed(() => permissions.GOAL_CAN_EDIT)
  const canManageUsers = computed(() => permissions.GOAL_CAN_MANAGE_USERS)
  const canAddTaskList = computed(() => permissions.GOAL_CAN_ADD_TASK_LIST)
  const canViewLists = computed(() => permissions.GOAL_CAN_WATCH_CONTENT)
  const canDeleteList = computed(() => permissions.COMPONENT_CAN_DELETE)
  const canEditList = computed(() => permissions.COMPONENT_CAN_EDIT)
  const canViewTasks = computed(() => permissions.COMPONENT_CAN_WATCH_CONTENT)
  const canAddTask = computed(() => permissions.COMPONENT_CAN_ADD_TASKS)
  const canDeleteTask = computed(() => permissions.TASK_CAN_DELETE)
  const canEditTaskDescription = computed(() => permissions.TASK_CAN_EDIT_DESCRIPTION)
  const canEditTaskStatus = computed(() => permissions.TASK_CAN_EDIT_STATUS)
  const canEditTaskNote = computed(() => permissions.TASK_CAN_EDIT_NOTE)
  const canViewTaskNote = computed(() => permissions.TASK_CAN_WATCH_NOTE)
  const canEditTaskDeadline = computed(() => permissions.TASK_CAN_EDIT_DEADLINE)
  const canViewTaskDetails = computed(() => permissions.TASK_CAN_WATCH_DETAILS)
  const canViewTaskSubtasks = computed(() => permissions.TASK_CAN_WATCH_SUBTASKS)
  const canAddTaskSubtasks = computed(() => permissions.TASK_CAN_ADD_SUBTASKS)
  const canEditTaskTags = computed(() => permissions.TASK_CAN_EDIT_TAGS)
  const canViewTaskTags = computed(() => permissions.TASK_CAN_WATCH_TAGS)
  const canViewTaskPriority = computed(() => permissions.TASK_CAN_WATCH_PRIORITY)
  const canEditTaskPriority = computed(() => permissions.TASK_CAN_EDIT_PRIORITY)
  const canAccessTaskHistory = computed(() => permissions.TASK_CAN_ACCESS_HISTORY)
  const canRecoveryTaskHistory = computed(() => permissions.TASK_CAN_RECOVERY_HISTORY)
  const canAssignUsersToTask = computed(() => permissions.TASK_CAN_ASSIGN_USERS)
  const canViewAssignedUsersToTask = computed(() => permissions.TASK_CAN_WATCH_ASSIGNED_USERS)
  const canViewKanban = computed(() => permissions.KANBAN_CAN_VIEW || permissions.KANBAN_CAN_MANAGE)
  const canManageKanban = computed(() => permissions.KANBAN_CAN_MANAGE)
  const canViewGraph = computed(() => permissions.GRAPH_CAN_VIEW || permissions.GRAPH_CAN_MANAGE)
  const canManageGraph = computed(() => permissions.GRAPH_CAN_MANAGE)

  return {
    permissions,
    canDeleteGoal,
    canEditGoal,
    canManageUsers,
    canAddTaskList,
    canViewLists,
    canDeleteList,
    canEditList,
    canViewTasks,
    canAddTask,
    canDeleteTask,
    canEditTaskDescription,
    canEditTaskStatus,
    canEditTaskNote,
    canViewTaskNote,
    canEditTaskDeadline,
    canViewTaskDetails,
    canViewTaskSubtasks,
    canAddTaskSubtasks,
    canEditTaskTags,
    canViewTaskTags,
    canViewTaskPriority,
    canEditTaskPriority,
    canAccessTaskHistory,
    canRecoveryTaskHistory,
    canAssignUsersToTask,
    canViewAssignedUsersToTask,
    canViewKanban,
    canManageKanban,
    canViewGraph,
    canManageGraph,
  }
}
