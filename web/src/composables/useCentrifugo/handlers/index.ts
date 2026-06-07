import type { RealtimeEventMap, RealtimeHandler } from '../types'
import { handleNotification } from './notification'
import { handleGoalsChanged } from './goals-changed'
import { handleRecurrenceInstanceCreated } from './recurrence'
import {
  handleTimeEntryCreated,
  handleTimeEntryDeleted,
  handleTimeEntryStarted,
  handleTimeEntryStopped,
  handleTimeEntryUpdated,
} from './time-entry'

export const eventHandlers: { [K in keyof RealtimeEventMap]: RealtimeHandler<K> } = {
  'notification': handleNotification,
  'goals.changed': handleGoalsChanged,
  'time-entry.started': handleTimeEntryStarted,
  'time-entry.stopped': handleTimeEntryStopped,
  'time-entry.created': handleTimeEntryCreated,
  'time-entry.updated': handleTimeEntryUpdated,
  'time-entry.deleted': handleTimeEntryDeleted,
  'recurrence.instanceCreated': handleRecurrenceInstanceCreated,
}
