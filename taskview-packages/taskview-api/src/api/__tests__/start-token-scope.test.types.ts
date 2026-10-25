import type { TvApi } from '@/tv'
import type { SessionUser } from './auth-test-helpers.types'

export type StartScopeProject = {
  goalId: number
  listId: number
  tagId: number
  activeTaskId: number
}

export type StartScopeExcludedProject = StartScopeProject & {
  todayTaskId: number
  upcomingTaskId: number
  completedTaskId: number
  collaboratorEmail: string
}

export type StartScopeFixture = {
  marker: string
  owner: SessionUser
  ownerApi: TvApi
  /** owned by `owner`, the only project the scoped tokens are issued for */
  projectA: StartScopeProject & { collaboratorId: number }
  /** owned by `owner`, excluded from every project-scoped token */
  projectB: StartScopeExcludedProject
  /** owned by another user and shared with `owner` as editor, excluded from every project-scoped token */
  projectC: StartScopeProject
}

export type ScopedTokenArgs = {
  allowedPermissions: string[]
  allowedGoalIds: number[]
}

export type ScopedToken = {
  token: string
  api: TvApi
}
