import type { StartDashboardBucket } from '@/api/start.types'
import type { TaskArgUpdate } from '@/api/tasks.api.types'
import type { TvApi } from '@/tv'

export type StartDashboardCreateTaskArgs = {
  goalId: number
  patch?: Omit<TaskArgUpdate, 'id'>
}

export type StartDashboardBucketTasksArgs = {
  api: TvApi
  goalId: number
  bucket: StartDashboardBucket
  date?: string
}
