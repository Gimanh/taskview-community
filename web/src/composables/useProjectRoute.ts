import type { RouteLocationRaw } from 'vue-router'
import { ALL_TASKS_LIST_ID, type DefaultView, type GoalItem, type GoalPermissions } from 'taskview-api'
import { useUiPreferencesStore } from '@/stores/uiPreferences.store'
import { AllGoalPermissions } from '@/types/goals.types'

export const VIEW_ROUTES: Record<DefaultView, string> = {
  tasks: 'user',
  kanban: 'kanban',
  graph: 'graph',
  sprints: 'sprints',
}

const VIEW_PERMISSIONS: Record<Exclude<DefaultView, 'tasks'>, (keyof GoalPermissions)[]> = {
  kanban: [AllGoalPermissions.KANBAN_CAN_VIEW, AllGoalPermissions.KANBAN_CAN_MANAGE],
  graph: [AllGoalPermissions.GRAPH_CAN_VIEW, AllGoalPermissions.GRAPH_CAN_MANAGE],
  sprints: [AllGoalPermissions.SPRINT_CAN_VIEW],
}

function canOpenView(goal: GoalItem, view: DefaultView): boolean {
  if (view === 'tasks') return true
  return VIEW_PERMISSIONS[view].some((perm) => !!goal.permissions[perm])
}

export function useProjectRoute() {
  const uiPrefs = useUiPreferencesStore()

  function projectRoute(goal: GoalItem, orgSlug?: string): RouteLocationRaw {
    const preferred = uiPrefs.settings.defaultView ?? 'tasks'
    const view: DefaultView = canOpenView(goal, preferred) ? preferred : 'tasks'
    const params: Record<string, string | number> = { projectId: goal.id }
    if (orgSlug) params.orgSlug = orgSlug
    if (view === 'tasks') params.listId = ALL_TASKS_LIST_ID
    return { name: VIEW_ROUTES[view], params }
  }

  return { projectRoute }
}
