import type { TvFile, TvFileKindFilter } from 'taskview-api'

export type FileKind = 'image' | 'pdf' | 'video' | 'audio' | 'text' | 'other'

export type FileUploadStatus = 'uploading' | 'error'

export type FileUploadItem = {
  id: string
  goalId: number
  taskId: number | null
  file: File
  name: string
  sizeBytes: number
  progress: number
  status: FileUploadStatus
  errorKey: string | null
  controller: AbortController
}

export type FilesProjectListState = {
  goalId: number | null
  items: TvFile[]
  nextCursor: string | null
  search: string
  type: TvFileKindFilter
  loading: boolean
}

export type FilesStoreState = {
  byTask: Record<number, TvFile[]>
  loadingTasks: Record<number, boolean>
  project: FilesProjectListState
  uploads: FileUploadItem[]
}

export type FilesUploadArgs = {
  goalId: number
  taskId: number | null
  files: File[]
}

export type FilesFetchForGoalArgs = {
  goalId: number
  search?: string
  type?: TvFileKindFilter
  append?: boolean
}

export type FilesRemoteChangeArgs = {
  goalId: number
  taskIds: number[]
}

export type FilesOpenArgs = {
  file: TvFile
  inline: boolean
}
