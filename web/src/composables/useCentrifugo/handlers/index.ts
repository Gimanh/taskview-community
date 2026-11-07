import type { RealtimeEventMap, RealtimeHandler } from '../types'
import { handleNotification } from './notification'
import { handleGoalsChanged } from './goals-changed'
import { handleRecurrenceInstanceCreated } from './recurrence'
import { handleFilesChanged } from './files'
import { handleTagsChanged } from './tags'
import { handleTasksChanged } from './tasks'
import { handleImportFinished, handleImportProgress } from './import'
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
  'files.changed': handleFilesChanged,
  'tags.changed': handleTagsChanged,
  'tasks.changed': handleTasksChanged,
  'import.progress': handleImportProgress,
  'import.finished': handleImportFinished,
}
