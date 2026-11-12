import { computed, onScopeDispose, watch } from 'vue'
import { useNow } from '@vueuse/core'
import { format, startOfWeek } from 'date-fns'
import { projectColor } from '@/helpers/color'
import { MainDashboardModelBuilder } from '@/helpers/MainDashboardModelBuilder'
import { useRefreshOnResume } from '@/composables/useRefreshOnResume'
import { useWeekStart } from '@/composables/useWeekStart'
import { useGoalsStore } from '@/stores/goals.store'
import { useMainDashboardStore } from '@/stores/main-dashboard.store'
import { useOrganizationStore } from '@/stores/organization.store'
import type { MainDashboardProjectRow } from '@/types/main-dashboard.types'
import type { ProjectDashboardModel } from '@/types/project-dashboard.types'

const DEFAULT_WEEK_START = 1
const DAY_CHECK_INTERVAL_MS = 60_000

export function useMainDashboard() {
  const store = useMainDashboardStore()
  const goalsStore = useGoalsStore()
  const organizationStore = useOrganizationStore()
  const preferredWeekStart = useWeekStart()

  const weekStart = computed(() => preferredWeekStart.value ?? DEFAULT_WEEK_START)
  const organizationId = computed(() => organizationStore.currentOrg?.id ?? null)

  function load() {
    const now = new Date()
    void store.fetch({
      organizationId: organizationId.value,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      weekStart: weekStart.value,
      hoursFrom: startOfWeek(now, { weekStartsOn: weekStart.value }).toISOString(),
      hoursTo: now.toISOString(),
    })
  }

  // The server counts for the caller's current day: a dashboard left open overnight asks again when the day changes
  const now = useNow({ interval: DAY_CHECK_INTERVAL_MS })
  const today = computed(() => format(now.value, 'yyyy-MM-dd'))

  watch([organizationId, weekStart, today], load, { immediate: true })
  useRefreshOnResume(load)
  onScopeDispose(() => store.reset())

  const model = computed<ProjectDashboardModel | null>(() => {
    if (!store.data) return null
    return new MainDashboardModelBuilder({ data: store.data, hoursByUser: store.hoursByUser }).build()
  })

  const projects = computed<MainDashboardProjectRow[]>(() => (store.data?.projects ?? []).flatMap((project) => {
    const goal = goalsStore.goalMap.get(project.goalId)
    if (!goal || !project.total) return []
    return [{
      goalId: project.goalId,
      name: goal.name,
      color: projectColor(goal),
      total: project.total,
      open: project.open,
      overdue: project.overdue,
      progress: Math.round((project.done / project.total) * 100),
    }]
  }))

  return {
    model,
    projects,
    loading: computed(() => store.loading && !store.data),
    failed: computed(() => store.failed),
    reload: load,
  }
}
