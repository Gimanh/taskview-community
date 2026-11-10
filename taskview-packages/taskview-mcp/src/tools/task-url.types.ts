import type { TvApi } from 'taskview-api'

export type TaskUrlBuilderArgs = {
  api: TvApi
  appUrl?: string
}

export type TaskUrlSource = {
  id: number
  goalId: number
}
