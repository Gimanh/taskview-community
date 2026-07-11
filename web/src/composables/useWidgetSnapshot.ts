import { watch } from 'vue'
import { useDebounceFn, useDateFormat } from '@vueuse/core'
import { Capacitor } from '@capacitor/core'
import { useI18n } from 'vue-i18n'
import { ALL_TASKS_LIST_ID } from 'taskview-api'
import { WidgetBridge, type WidgetSnapshot, type WidgetSnapshotTask } from 'capacitor-widget-bridge'
import { useBaseScreenStore } from '@/stores/base-screen.store'
import { useOrganizationStore } from '@/stores/organization.store'
import { useRefreshOnResume } from '@/composables/useRefreshOnResume'
import type { TaskItem } from '@/types/tasks.types'

const MAX_WIDGET_TASKS = 10

export function useWidgetSnapshot() {
  if (!Capacitor.isNativePlatform()) return

  const baseScreenStore = useBaseScreenStore()
  const orgStore = useOrganizationStore()
  const { locale } = useI18n()

  const todayYmd = () => useDateFormat(new Date(), 'YYYY-MM-DD').value

  const isOverdue = (task: TaskItem) => {
    if (!task.endDate) return false
    return useDateFormat(new Date(task.endDate), 'YYYY-MM-DD').value < todayYmd()
  }

  const toSnapshotTask = (task: TaskItem): WidgetSnapshotTask => ({
    id: task.id,
    title: task.description,
    priority: task.priorityId,
    overdue: isOverdue(task),
    endTime: task.endTime,
    endDate: task.endDate ? useDateFormat(new Date(task.endDate), 'YYYY-MM-DD').value : null,
    path: `/${orgStore.currentOrgSlug}/${task.goalId}/${task.goalListId ?? ALL_TASKS_LIST_ID}/${task.id}`,
  })

  const buildSnapshot = (): WidgetSnapshot => {
    const openToday = baseScreenStore.tasksToday.filter((task) => !task.complete)
    const openUpcoming = baseScreenStore.tasksUpcoming
      .filter((task) => !task.complete)
      .sort((a, b) => new Date(a.endDate ?? 0).getTime() - new Date(b.endDate ?? 0).getTime())
    const mode = openToday.length === 0 && openUpcoming.length > 0 ? 'upcoming' : 'today'
    const shownTasks = mode === 'today' ? openToday : openUpcoming
    return {
      v: 3,
      generatedAt: new Date().toISOString(),
      locale: locale.value,
      orgSlug: orgStore.currentOrgSlug || null,
      mode,
      todayCount: openToday.length,
      overdueCount: openToday.filter(isOverdue).length,
      upcomingCount: openUpcoming.length,
      tasks: shownTasks.slice(0, MAX_WIDGET_TASKS).map(toSnapshotTask),
    }
  }

  const writeSnapshot = useDebounceFn(async () => {
    if (!baseScreenStore.wasCalled) return
    await WidgetBridge.setSnapshot({ snapshot: JSON.stringify(buildSnapshot()) }).catch((err) => {
      console.error('[WidgetSnapshot] Failed to write snapshot:', err)
    })
  }, 500)

  watch(
    () => [baseScreenStore.tasksToday, baseScreenStore.tasksUpcoming, orgStore.currentOrgSlug, locale.value] as const,
    () => writeSnapshot(),
    { deep: true },
  )

  useRefreshOnResume(() => {
    if (baseScreenStore.wasCalled) baseScreenStore.fetchAllState()
  })
}
