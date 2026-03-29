import type { Notification } from 'taskview-api'

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
}

export type RealtimeEvent = RealtimeEventMap[keyof RealtimeEventMap]

export type RealtimeHandler<T extends keyof RealtimeEventMap> = (data: RealtimeEventMap[T]) => void
