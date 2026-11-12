import { useMainDashboardStore } from '@/stores/main-dashboard.store'
import { useProjectDashboardStore } from '@/stores/project-dashboard.store'
import { useTimeTrackingStore } from '@/stores/time-tracking.store'
import type { RealtimeEventMap } from '../types'

export function handleTimeEntryStarted(data: RealtimeEventMap['time-entry.started']) {
  useTimeTrackingStore().handleRealtimeStarted(data.entry)
}

// The dashboards show hours logged this week: recount them when logged time changes
function refreshDashboardHours(goalId: number | null) {
  useProjectDashboardStore().handleRemoteChange(goalId)
  useMainDashboardStore().handleRemoteChange()
}

export function handleTimeEntryStopped(data: RealtimeEventMap['time-entry.stopped']) {
  useTimeTrackingStore().handleRealtimeStopped(data.entry)
  refreshDashboardHours(data.entry.goalId)
}

export function handleTimeEntryCreated(data: RealtimeEventMap['time-entry.created']) {
  useTimeTrackingStore().handleRealtimeCreated(data.entry)
  refreshDashboardHours(data.entry.goalId)
}

export function handleTimeEntryUpdated(data: RealtimeEventMap['time-entry.updated']) {
  const store = useTimeTrackingStore()
  store.replaceInTask(data.entry)
  if (store.active?.id === data.entry.id) {
    store.active = data.entry.endedAt ? null : data.entry
  }
  refreshDashboardHours(data.entry.goalId)
}

export function handleTimeEntryDeleted(data: RealtimeEventMap['time-entry.deleted']) {
  useTimeTrackingStore().handleRealtimeDeleted({ entryId: data.entryId, taskId: data.taskId })
  refreshDashboardHours(null)
}
