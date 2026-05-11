import { useTimeTrackingStore } from '@/stores/time-tracking.store'
import type { RealtimeEventMap } from '../types'

export function handleTimeEntryStarted(data: RealtimeEventMap['time-entry.started']) {
  useTimeTrackingStore().handleRealtimeStarted(data.entry)
}

export function handleTimeEntryStopped(data: RealtimeEventMap['time-entry.stopped']) {
  useTimeTrackingStore().handleRealtimeStopped(data.entry)
}

export function handleTimeEntryCreated(data: RealtimeEventMap['time-entry.created']) {
  useTimeTrackingStore().handleRealtimeCreated(data.entry)
}

export function handleTimeEntryUpdated(data: RealtimeEventMap['time-entry.updated']) {
  const store = useTimeTrackingStore()
  store.replaceInTask(data.entry)
  if (store.active?.id === data.entry.id) {
    store.active = data.entry.endedAt ? null : data.entry
  }
}

export function handleTimeEntryDeleted(data: RealtimeEventMap['time-entry.deleted']) {
  useTimeTrackingStore().handleRealtimeDeleted({ entryId: data.entryId, taskId: data.taskId })
}
