import type { TvApi } from '@/tv'
import type { SessionUser } from './auth-test-helpers.types'

export type WebhooksMember = {
  user: SessionUser
  api: TvApi
}

export type WebhooksPermissionsFixture = {
  owner: WebhooksMember
  /** role: goal_can_watch_content + webhooks_can_view */
  viewer: WebhooksMember
  /** role: goal_can_watch_content + webhooks_can_manage */
  manager: WebhooksMember
  /** role: goal_can_watch_content only */
  member: WebhooksMember
  /** role: goal_can_watch_content + webhooks_can_view + webhooks_can_manage */
  fullManager: WebhooksMember
  goalId: number
  /** another project of the owner nobody else is a member of */
  privateGoalId: number
  privateWebhookId: number
  webhookId: number
  webhookUrl: string
  deliveryId: number
}

export type AddMemberArgs = {
  goalId: number
  permissions: string[]
}

export type MemberTokenArgs = {
  member: WebhooksMember
  allowedPermissions: string[]
  allowedGoalIds: number[]
}
