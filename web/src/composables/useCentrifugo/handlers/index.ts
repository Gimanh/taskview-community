import type { RealtimeEventMap, RealtimeHandler } from '../types'
import { handleNotification } from './notification'
import { handleGoalsChanged } from './goals-changed'

export const eventHandlers: { [K in keyof RealtimeEventMap]: RealtimeHandler<K> } = {
  'notification': handleNotification,
  'goals.changed': handleGoalsChanged,
}
