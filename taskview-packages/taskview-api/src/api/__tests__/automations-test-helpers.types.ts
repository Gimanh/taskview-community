import type { TvApi } from '@/tv'
import type { AutomationErrorCode } from '@/api/automations.types'

export type AutomationsTestProject = {
  goalId: number
  todoId: number
  doneId: number
  reviewId: number
  tagAId: number
  tagBId: number
  listAId: number
  listBId: number
}

export type AutomationsCreateProjectArgs = {
  api: TvApi
  name: string
}

export type AutomationsExpectErrorArgs = {
  request: Promise<unknown>
  status: number
  code?: AutomationErrorCode
}

export type AutomationsShareGoalArgs = {
  ownerApi: TvApi
  goalId: number
  email: string
  permissionIdByName: Map<string, number>
  permissions: string[]
}

export type AutomationsSharedGoal = {
  roleId: number
}

export type AutomationsCreateTaskArgs = {
  api: TvApi
  goalId: number
  statusId?: number
  goalListId?: number
}
