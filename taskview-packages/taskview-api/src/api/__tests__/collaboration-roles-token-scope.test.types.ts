import type { TvApi } from '@/tv'
import type { SessionUser } from './auth-test-helpers.types'

export type RolesScopeProject = {
  goalId: number
  webhookId: number
}

export type RolesScopeFixture = {
  owner: SessionUser
  ownerApi: TvApi
  /** the only project the project-scoped tokens are issued for */
  projectA: RolesScopeProject
  /** owned by the same user, outside every project-scoped token */
  projectB: RolesScopeProject
  watchContentPermissionId: number
}

export type RolesScopeTokenArgs = {
  allowedPermissions: string[]
  allowedGoalIds: number[]
}
