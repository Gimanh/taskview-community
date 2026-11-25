import { useCollaborationStore } from '@/stores/collaboration.store'
import { useGoalsStore } from '@/stores/goals.store'
import { useTasksStore } from '@/stores/tasks.store'
import { useTimeTrackingStore } from '@/stores/time-tracking.store'
import type { TaskArgToggleAssignee } from 'taskview-api'
import type { OnboardingStep } from '../types'
import { useOnboardingStepHelpers } from './useOnboardingStepHelpers'
import { useOnboardingActionLog } from './useOnboardingActionLog'
import { isOnboardingTargetMounted, isOnboardingTargetPresent } from './useOnboardingTarget'
import { useUiPreferences } from '@/composables/useUiPreferences'
import { tasksSection } from '@/uiCustomization/sections/tasks'

export function useOnboardingSteps() {
  const goalsStore = useGoalsStore()
  const tasksStore = useTasksStore()
  const collaborationStore = useCollaborationStore()
  const timeTrackingStore = useTimeTrackingStore()
  const helpers = useOnboardingStepHelpers()
  const actions = useOnboardingActionLog()

  actions.listen(goalsStore, { addGoal: null })
  actions.listen(collaborationStore, { addCollaborationUser: null })
  // A finished entry is what the reports show: a timer that was only started is not one yet
  actions.listen(timeTrackingStore, { stop: null, createManual: null })
  actions.listen(tasksStore, {
    addTask: null,
    updateTaskAssignee: ([data]) => (data as TaskArgToggleAssignee).userIds.length > 0,
  })

  const hasProject = () => helpers.tourProject() !== null
  const invitedCount = () => collaborationStore.users.filter((user) => !user.goalOwner).length

  const createProject: OnboardingStep = {
    id: 'project-create',
    title: 'onboarding.steps.projectCreate.title',
    body: 'onboarding.steps.projectCreate.body',
    target: 'project-add',
    side: 'bottom',
    prepare: helpers.showSidebarOnMobile,
    watchDone: actions.watchAction('addGoal'),
  }

  const createTask: OnboardingStep = {
    id: 'task-create',
    title: 'onboarding.steps.taskCreate.title',
    body: 'onboarding.steps.taskCreate.body',
    target: 'task-add',
    requiresTarget: true,
    side: 'bottom',
    available: hasProject,
    prepare: async () => {
      helpers.hideSidebarOnMobile()
      await helpers.openProjectTasks()
    },
    watchDone: actions.watchAction('addTask'),
  }

  const openCollaboration: OnboardingStep = {
    id: 'collab-open',
    title: 'onboarding.steps.collabOpen.title',
    body: 'onboarding.steps.collabOpen.body',
    target: 'tool-collaboration',
    side: 'right',
    available: () => hasProject() && helpers.can('GOAL_CAN_MANAGE_USERS') && !helpers.isOn('collaboration'),
    prepare: helpers.showProjectTools,
    watchDone: helpers.watchRoute('collaboration'),
    navigateTo: () => helpers.projectRoute('collaboration'),
  }

  const inviteMember: OnboardingStep = {
    id: 'collab-invite',
    title: 'onboarding.steps.collabInvite.title',
    body: 'onboarding.steps.collabInvite.body',
    target: 'collab-invite',
    side: 'bottom',
    available: () => hasProject() && helpers.can('GOAL_CAN_MANAGE_USERS'),
    prepare: () => helpers.openProjectScreen('collaboration'),
    watchDone: actions.watchAction('addCollaborationUser'),
  }

  const hasInvited = () => hasProject() && helpers.can('GOAL_CAN_MANAGE_USERS') && invitedCount() > 0

  const openMemberMenu: OnboardingStep = {
    id: 'collab-member-menu',
    title: 'onboarding.steps.collabMemberMenu.title',
    body: 'onboarding.steps.collabMemberMenu.body',
    target: ['collab-member-assign', 'collab-member-menu'],
    side: 'left',
    available: hasInvited,
    prepare: () => helpers.openProjectScreen('collaboration'),
    watchDone: helpers.watchTargetShown('collab-member-roles'),
  }

  const assignMemberRoles: OnboardingStep = {
    id: 'collab-member-roles',
    title: 'onboarding.steps.collabMemberRoles.title',
    body: 'onboarding.steps.collabMemberRoles.body',
    target: 'collab-member-roles',
    side: { desktop: 'right', mobile: 'top' },
    available: () => hasInvited() && isOnboardingTargetPresent('collab-member-roles'),
    watchDone: helpers.watchTargetGone('collab-member-roles'),
  }

  const openRolesTab: OnboardingStep = {
    id: 'collab-roles-tab',
    title: 'onboarding.steps.collabRolesTab.title',
    body: 'onboarding.steps.collabRolesTab.body',
    target: 'collab-tab-roles',
    side: 'bottom',
    available: () => hasProject() && helpers.can('GOAL_CAN_MANAGE_USERS'),
    prepare: () => helpers.openProjectScreen('collaboration'),
    watchDone: helpers.watchTargetShown('collab-roles'),
  }

  const rolePermissions: OnboardingStep = {
    id: 'collab-role-permissions',
    title: 'onboarding.steps.collabRolePermissions.title',
    body: 'onboarding.steps.collabRolePermissions.body',
    target: ['collab-permissions', 'collab-role-permissions', 'collab-role-menu'],
    side: 'left',
    available: () => hasProject() && helpers.can('GOAL_CAN_MANAGE_USERS') && isOnboardingTargetPresent('collab-roles'),
  }

  const openTask: OnboardingStep = {
    id: 'task-open',
    title: 'onboarding.steps.taskOpen.title',
    body: 'onboarding.steps.taskOpen.body',
    target: 'task-item',
    requiresTarget: true,
    side: 'bottom',
    available: hasProject,
    prepare: helpers.openProjectTasks,
    watchDone: () => () => tasksStore.selectedTask !== null,
  }

  const assignTask: OnboardingStep = {
    id: 'task-assign',
    title: 'onboarding.steps.taskAssign.title',
    body: 'onboarding.steps.taskAssign.body',
    target: 'task-assignee',
    requiresTarget: true,
    side: 'top',
    available: () => tasksStore.selectedTask !== null,
    watchDone: actions.watchAction('updateTaskAssignee'),
  }

  const taskTitle: OnboardingStep = {
    id: 'task-title',
    title: 'onboarding.steps.taskTitle.title',
    body: 'onboarding.steps.taskTitle.body',
    target: 'task-title',
    requiresTarget: true,
    side: 'bottom',
    available: () => tasksStore.selectedTask !== null,
  }

  // One step for every block of the task: the block's own name is its title
  const taskFieldBodies: Record<string, string> = {
    subtasks: 'onboarding.steps.taskFieldSubtasks.body',
    note: 'onboarding.steps.taskFieldNote.body',
    files: 'onboarding.steps.taskFieldFiles.body',
    status: 'onboarding.steps.taskFieldStatus.body',
    priority: 'onboarding.steps.taskFieldPriority.body',
    assignees: 'onboarding.steps.taskFieldAssignees.body',
    list: 'onboarding.steps.taskFieldList.body',
    sprint: 'onboarding.steps.taskFieldSprint.body',
    estimate: 'onboarding.steps.taskFieldEstimate.body',
    tags: 'onboarding.steps.taskFieldTags.body',
    deadline: 'onboarding.steps.taskFieldDeadline.body',
    dependencies: 'onboarding.steps.taskFieldDependencies.body',
    amount: 'onboarding.steps.taskFieldAmount.body',
    timeTracking: 'onboarding.steps.taskFieldTimeTracking.body',
    history: 'onboarding.steps.taskFieldHistory.body',
  }

  const { catalogue: taskFieldsCatalogue } = tasksSection.useSection()
  const { resolved: arrangedTaskFields } = useUiPreferences(tasksSection.id, () => taskFieldsCatalogue.value)

  // In the order the user arranged the task in; a block that is hidden or not allowed is not in the page and is passed over
  function taskFieldSteps(): OnboardingStep[] {
    return arrangedTaskFields.value
      .filter((field) => field.id in taskFieldBodies)
      .map((field) => ({
        id: `task-field-${field.id}`,
        title: `uiCustomization.taskFields.${field.id}`,
        body: taskFieldBodies[field.id],
        target: `task-field-${field.id}`,
        requiresTarget: true,
        side: 'top',
        available: () => tasksStore.selectedTask !== null && isOnboardingTargetMounted(`task-field-${field.id}`),
      }))
  }

  const openKanban: OnboardingStep = {
    id: 'view-kanban',
    title: 'onboarding.steps.viewKanban.title',
    body: 'onboarding.steps.viewKanban.body',
    target: { desktop: 'tool-kanban', mobile: 'nav-kanban' },
    side: { desktop: 'right', mobile: 'top' },
    available: () => hasProject() && helpers.can('KANBAN_CAN_VIEW') && !helpers.isOn('kanban'),
    prepare: helpers.openProject,
    watchDone: helpers.watchRoute('kanban'),
    navigateTo: () => helpers.projectRoute('kanban'),
  }

  const lookAtKanban: OnboardingStep = {
    id: 'view-kanban-look',
    title: 'onboarding.steps.viewKanbanLook.title',
    body: 'onboarding.steps.viewKanbanLook.body',
    docked: true,
    available: () => hasProject() && helpers.can('KANBAN_CAN_VIEW'),
    prepare: () => helpers.openProjectScreen('kanban'),
  }

  const openCalendar: OnboardingStep = {
    id: 'view-calendar',
    title: 'onboarding.steps.viewCalendar.title',
    body: 'onboarding.steps.viewCalendar.body',
    target: 'tool-calendar',
    side: 'right',
    available: () => hasProject() && !helpers.isOn('calendar'),
    prepare: helpers.showProjectTools,
    watchDone: helpers.watchRoute('calendar'),
    navigateTo: () => helpers.projectRoute('calendar'),
  }

  const lookAtCalendar: OnboardingStep = {
    id: 'view-calendar-look',
    title: 'onboarding.steps.viewCalendarLook.title',
    body: 'onboarding.steps.viewCalendarLook.body',
    docked: true,
    available: hasProject,
    prepare: () => helpers.openProjectScreen('calendar'),
  }

  const openGraph: OnboardingStep = {
    id: 'view-graph',
    title: 'onboarding.steps.viewGraph.title',
    body: 'onboarding.steps.viewGraph.body',
    target: { desktop: 'tool-graph', mobile: 'nav-graph' },
    side: { desktop: 'right', mobile: 'top' },
    available: () => hasProject() && helpers.can('GRAPH_CAN_VIEW') && !helpers.isOn('graph'),
    prepare: helpers.openProject,
    watchDone: helpers.watchRoute('graph'),
    navigateTo: () => helpers.projectRoute('graph'),
  }

  const lookAtGraph: OnboardingStep = {
    id: 'view-graph-look',
    title: 'onboarding.steps.viewGraphLook.title',
    body: 'onboarding.steps.viewGraphLook.body',
    docked: true,
    available: () => hasProject() && helpers.can('GRAPH_CAN_VIEW'),
    prepare: () => helpers.openProjectScreen('graph'),
  }

  const pickTaskForTime: OnboardingStep = {
    id: 'time-task',
    title: 'onboarding.steps.timeTask.title',
    body: 'onboarding.steps.timeTask.body',
    target: 'task-add',
    dockPopover: true,
    available: hasProject,
    prepare: async () => {
      helpers.hideSidebarOnMobile()
      await helpers.openProjectTasks()
    },
    watchDone: () => {
      const added = actions.watchAction('addTask')()
      return () => added() || tasksStore.selectedTask !== null
    },
  }

  // Only for a task that was added on the step before: one picked from the list is open already
  const openTaskForTime: OnboardingStep = {
    ...openTask,
    id: 'time-task-open',
    available: () => hasProject() && tasksStore.selectedTask === null,
  }

  const logTime: OnboardingStep = {
    id: 'time-log',
    title: 'onboarding.steps.timeLog.title',
    body: 'onboarding.steps.timeLog.body',
    target: 'task-time-tracking',
    requiresTarget: true,
    side: 'top',
    available: () => tasksStore.selectedTask !== null && helpers.can('TIMETRACKING_CAN_LOG'),
    watchDone: () => {
      const stopped = actions.watchAction('stop')()
      const added = actions.watchAction('createManual')()
      return () => stopped() || added()
    },
  }

  const openTimeReports: OnboardingStep = {
    id: 'time-reports-open',
    title: 'onboarding.steps.timeReportsOpen.title',
    body: 'onboarding.steps.timeReportsOpen.body',
    target: 'workspace-link-time-reports',
    side: 'right',
    available: () => !helpers.isOn('time-reports'),
    prepare: helpers.showSidebarOnMobile,
    watchDone: helpers.watchRoute('time-reports'),
    navigateTo: () => ({ name: 'time-reports' }),
  }

  const timeReportsFilters: OnboardingStep = {
    id: 'time-reports-filters',
    title: 'onboarding.steps.timeReportsFilters.title',
    body: 'onboarding.steps.timeReportsFilters.body',
    target: 'time-reports-filters',
    side: 'bottom',
    prepare: () => helpers.openWorkspaceScreen('time-reports'),
  }

  const timeReportsTotals: OnboardingStep = {
    id: 'time-reports-totals',
    title: 'onboarding.steps.timeReportsTotals.title',
    body: 'onboarding.steps.timeReportsTotals.body',
    target: 'time-reports-kpis',
    side: 'bottom',
    prepare: () => helpers.openWorkspaceScreen('time-reports'),
  }

  const timeReportsViews: OnboardingStep = {
    id: 'time-reports-views',
    title: 'onboarding.steps.timeReportsViews.title',
    body: 'onboarding.steps.timeReportsViews.body',
    target: 'time-reports-tabs',
    side: 'top',
    prepare: () => helpers.openWorkspaceScreen('time-reports'),
  }

  const allSet: OnboardingStep = {
    id: 'all-set',
    title: 'onboarding.steps.allSet.title',
    body: 'onboarding.steps.allSet.body',
    prepare: helpers.closeTaskDetail,
  }

  // Someone who already has a project goes on from there instead of creating one more
  const createFirstProject: OnboardingStep = {
    ...createProject,
    essential: true,
    available: () => helpers.ownProjects().length === 0,
  }

  return {
    createProject,
    createFirstProject,
    createTask,
    openCollaboration,
    inviteMember,
    openMemberMenu,
    assignMemberRoles,
    openRolesTab,
    rolePermissions,
    openTask,
    assignTask,
    taskTitle,
    taskFieldSteps,
    openKanban,
    lookAtKanban,
    openCalendar,
    lookAtCalendar,
    openGraph,
    lookAtGraph,
    pickTaskForTime,
    openTaskForTime,
    logTime,
    openTimeReports,
    timeReportsFilters,
    timeReportsTotals,
    timeReportsViews,
    allSet,
  }
}
