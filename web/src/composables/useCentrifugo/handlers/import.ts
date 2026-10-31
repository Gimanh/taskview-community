import { useImportStore } from '@/stores/import.store'
import type { RealtimeEventMap } from '../types'

export function handleImportProgress(data: RealtimeEventMap['import.progress']) {
  useImportStore().handleProgress({ jobId: data.jobId, progress: data.progress })
}

export function handleImportFinished(data: RealtimeEventMap['import.finished']) {
  useImportStore().handleFinished({ jobId: data.jobId, status: data.status })
}
