import type { TvApi } from '@/tv'
import type { SessionUser } from './auth-test-helpers.types'

export type KanbanOrderMember = {
  user: SessionUser
  api: TvApi
}

export type KanbanOrderProject = {
  goalId: number
  /** column ids in the order the project was created with */
  columnIds: number[]
}

export type KanbanOrderShareArgs = {
  goalId: number
  member: KanbanOrderMember
  permissions: string[]
}

export type KanbanOrderTokenArgs = {
  allowedPermissions: string[]
  allowedGoalIds: number[]
}
