import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router'
import { ALL_TASKS_LIST_ID, type GoalItem } from 'taskview-api'
import { useGoalsStore } from '@/stores/goals.store'
import { useTasksStore } from '@/stores/tasks.store'
import { useDashboard } from '@/composables/useDashboard'
import { useInbox } from '@/composables/useInbox'
import { useTaskView } from '@/composables/useTaskView'
import { useTaskDetailPanel } from '@/composables/useTaskDetailPanel'
import { goalHasPermission } from '@/composables/useGoalPermissions'
import type { OnboardingPermission } from '../types'
import { isOnboardingTargetPresent } from './useOnboardingTarget'

const SIDEBAR_SETTLE_MS = 350

export function useOnboardingStepHelpers() {
  const route = useRoute()
  const router = useRouter()
  const goalsStore = useGoalsStore()
  const tasksStore = useTasksStore()
  const { isSidebarOpen } = useDashboard()
  const { isOwnInbox } = useInbox()
  const { isMobile } = useTaskView()
  const { closeTask } = useTaskDetailPanel()

  function ownProjects(): GoalItem[] {
    return goalsStore.goals.filter((goal) => !goal.archive && !isOwnInbox(goal))
  }

  // The project the tour works in: the open one, otherwise the newest (the one the user has just created)
  function tourProject(): GoalItem | null {
    const openId = Number(route.params.projectId) || null
    const open = openId ? goalsStore.goalMap.get(openId) ?? null : null
    if (open && !isOwnInbox(open)) return open
    return ownProjects().reduce<GoalItem | null>((newest, goal) => (!newest || goal.id > newest.id ? goal : newest), null)
  }

  function can(permission: OnboardingPermission): boolean {
    return goalHasPermission(tourProject(), permission)
  }

  function projectRoute(name: string): RouteLocationRaw | null {
    const project = tourProject()
    return project ? { name, params: { projectId: project.id } } : null
  }

  function settle(ms: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, ms))
  }

  async function closeTaskDetail() {
    if (route.name === 'user' && route.params.taskId) {
      await router.replace({ name: 'user', params: { ...route.params, taskId: undefined } })
      return
    }
    if (tasksStore.selectedTask) closeTask()
  }

  async function openProjectTasks() {
    await closeTaskDetail()
    const project = tourProject()
    if (!project) return
    const isThere = route.name === 'user' && Number(route.params.projectId) === project.id && !!route.params.listId
    if (!isThere) {
      await router.push({ name: 'user', params: { projectId: project.id, listId: ALL_TASKS_LIST_ID } })
    }
  }

  // The project tools are on screen only while a project is open
  async function openProject() {
    await closeTaskDetail()
    const project = tourProject()
    if (project && Number(route.params.projectId) !== project.id) {
      await router.push({ name: 'user', params: { projectId: project.id, listId: ALL_TASKS_LIST_ID } })
    }
  }

  async function showProjectTools() {
    await openProject()
    await showSidebarOnMobile()
  }

  async function openWorkspaceScreen(name: string) {
    if (route.name !== name) await router.push({ name })
  }

  function isOn(name: string): boolean {
    return route.name === name
  }

  async function openProjectScreen(name: string) {
    await closeTaskDetail()
    const to = projectRoute(name)
    if (to && route.name !== name) await router.push(to)
  }

  // The project tools of the mobile layout live in the sidebar drawer
  async function showSidebarOnMobile() {
    await closeTaskDetail()
    if (!isMobile.value || isSidebarOpen.value) return
    isSidebarOpen.value = true
    await settle(SIDEBAR_SETTLE_MS)
  }

  function hideSidebarOnMobile() {
    if (isMobile.value) isSidebarOpen.value = false
  }

  function watchRoute(name: string) {
    return () => () => route.name === name
  }

  function watchTargetShown(name: string) {
    return () => () => isOnboardingTargetPresent(name)
  }

  function watchTargetGone(name: string) {
    return () => {
      let seen = false
      return () => {
        const present = isOnboardingTargetPresent(name)
        if (present) seen = true
        return seen && !present
      }
    }
  }

  return {
    isMobile,
    ownProjects,
    tourProject,
    can,
    projectRoute,
    closeTaskDetail,
    openProjectTasks,
    openProjectScreen,
    openProject,
    showProjectTools,
    openWorkspaceScreen,
    isOn,
    showSidebarOnMobile,
    hideSidebarOnMobile,
    watchRoute,
    watchTargetShown,
    watchTargetGone,
  }
}
