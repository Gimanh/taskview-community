import type { Notification, Task, TimeEntryItem } from 'taskview-api'

export type RealtimeEventMap = {
  'notification': {
    event: 'notification'
    notification: Notification
    goalId: number | null
    goalListId: number | null
  }
  'goals.changed': {
    event: 'goals.changed'
    goalId: number
  }
  'time-entry.started': {
    event: 'time-entry.started'
    entry: TimeEntryItem
  }
  'time-entry.stopped': {
    event: 'time-entry.stopped'
    entry: TimeEntryItem
    durationSeconds: number
  }
  'time-entry.created': {
    event: 'time-entry.created'
    entry: TimeEntryItem
  }
  'time-entry.updated': {
    event: 'time-entry.updated'
    entry: TimeEntryItem
    changes: Record<string, unknown>
  }
  'time-entry.deleted': {
    event: 'time-entry.deleted'
    entryId: number
    taskId: number
  }
  'recurrence.instanceCreated': {
    event: 'recurrence.instanceCreated'
    goalId: number
    ruleId: number
    task: Task
  }
}

export type RealtimeEvent = RealtimeEventMap[keyof RealtimeEventMap]

export type RealtimeHandler<T extends keyof RealtimeEventMap> = (data: RealtimeEventMap[T]) => void
