import { useFilesStore } from '@/stores/files.store'
import type { RealtimeEventMap } from '../types'

export function handleFilesChanged(data: RealtimeEventMap['files.changed']) {
  useFilesStore().handleRemoteChange({ goalId: data.goalId, taskIds: data.taskIds })
}
