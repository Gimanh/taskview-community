import { computed, onScopeDispose, watch, type Ref } from 'vue'
import { useNow } from '@vueuse/core'
import { startOfWeek } from 'date-fns'
import { ProjectDashboardBuilder } from '@/helpers/ProjectDashboardBuilder'
import { useGoalPermissionsFor } from '@/composables/useGoalPermissions'
import { useRefreshOnResume } from '@/composables/useRefreshOnResume'
import { useWeekStart } from '@/composables/useWeekStart'
import { useCollaborationStore } from '@/stores/collaboration.store'
import { useGoalsStore } from '@/stores/goals.store'
import { useKanbanStore } from '@/stores/kanban.store'
import { useOrganizationStore } from '@/stores/organization.store'
import { useProjectDashboardStore } from '@/stores/project-dashboard.store'
import { DEFAULT_ID } from '@/types/app.types'
import type { ProjectDashboardBucket, ProjectDashboardBucketTask } from '@/types/project-dashboard.types'

const DEFAULT_WEEK_START = 1
const CLOCK_INTERVAL_MS = 60_000

export function useProjectDashboard(projectId: Ref<number>) {
  const store = useProjectDashboardStore()
  const goalsStore = useGoalsStore()
  const kanbanStore = useKanbanStore()
  const collaborationStore = useCollaborationStore()
  const organizationStore = useOrganizationStore()
  const preferredWeekStart = useWeekStart()

  const goal = computed(() => goalsStore.goalMap.get(projectId.value) ?? null)
  const {
    canViewKanban,
    canViewSprints,
    canViewTimeTracking,
    canViewTaskPriority,
    canViewAssignedUsersToTask,
  } = useGoalPermissionsFor(goal)
  const weekStart = computed(() => preferredWeekStart.value ?? DEFAULT_WEEK_START)
  const organizationId = computed(() => organizationStore.currentOrg?.id ?? null)

  function load() {
    if (!goal.value) return
    const now = new Date()
    void store.fetch({
      goalId: goal.value.id,
      organizationId: organizationId.value,
      withSprint: canViewSprints.value,
      withHours: canViewTimeTracking.value && canViewAssignedUsersToTask.value,
      hoursFrom: startOfWeek(now, { weekStartsOn: weekStart.value }).toISOString(),
      hoursTo: now.toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    })
  }

  watch(
    [() => goal.value?.id, canViewSprints, canViewTimeTracking, canViewAssignedUsersToTask, organizationId, weekStart],
    load,
    { immediate: true },
  )
  useRefreshOnResume(load)
  onScopeDispose(() => store.reset())

  const statuses = computed(() => {
    if (!canViewKanban.value) return null
    return kanbanStore.statuses.filter((status) => status.id !== DEFAULT_ID && status.goalId === projectId.value)
  })

  // Overdue and "today" depend on the clock: a dashboard left open recounts as deadlines pass and the day changes
  const now = useNow({ interval: CLOCK_INTERVAL_MS })

  const builder = computed(() => {
    if (!store.loaded || store.goalId !== projectId.value) return null
    return new ProjectDashboardBuilder({
      tasks: store.tasks,
      now: now.value,
      weekStart: weekStart.value,
      sprint: canViewSprints.value ? store.sprint : null,
      statuses: statuses.value,
      users: canViewAssignedUsersToTask.value ? collaborationStore.userMap : null,
      hoursByUser: canViewTimeTracking.value && canViewAssignedUsersToTask.value ? store.hoursByUser : null,
      withPriorities: canViewTaskPriority.value,
    })
  })

  const model = computed(() => builder.value?.build() ?? null)

  function bucketTasks(bucket: ProjectDashboardBucket): ProjectDashboardBucketTask[] {
    return builder.value?.bucketTasks(bucket) ?? []
  }

  return {
    goal,
    model,
    bucketTasks,
    loading: computed(() => store.loading && !store.loaded),
    // The projects are loaded and this one is not among them: it does not exist or the user has no access to it
    notFound: computed(() => goalsStore.initialized && !goal.value),
    failed: computed(() => store.failed),
    reload: load,
  }
}
