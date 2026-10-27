import type { NextFunction, Request, Response } from 'express'
import { GoalPermissions } from '../../../types/auth.types'
import type { WebhooksPermissionGuardArgs } from '../types'
import { WebhooksRepository } from '../WebhooksRepository'

const repository = new WebhooksRepository()

async function goalIdOfWebhook(webhookId: number): Promise<number | null> {
  return (await repository.fetchById(webhookId))?.goalId ?? null
}

async function goalIdOfDelivery(deliveryId: number): Promise<number | null> {
  const delivery = await repository.fetchDeliveryById(deliveryId)
  return delivery ? goalIdOfWebhook(delivery.webhookId) : null
}

function requireWebhooksPermission(args: WebhooksPermissionGuardArgs) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const goalId = await args.resolveGoalId(req)
    if (!goalId) return res.status(403).end()

    const checker = await req.appUser.permissionsFetcher.getCheckerForGoal(goalId)
    if (!checker.hasPermissions(args.permission)) return res.status(403).end()

    return next()
  }
}

const goalInQuery = async (req: Request) => Number(req.query?.goalId) || null
const goalInBody = async (req: Request) => Number(req.body?.goalId) || null
const webhookInBody = async (req: Request) => {
  const webhookId = Number(req.body?.id)
  return webhookId ? goalIdOfWebhook(webhookId) : null
}
const webhookInPath = async (req: Request) => {
  const webhookId = Number(req.params?.id)
  return webhookId ? goalIdOfWebhook(webhookId) : null
}
const deliveryInBody = async (req: Request) => {
  const deliveryId = Number(req.body?.id)
  return deliveryId ? goalIdOfDelivery(deliveryId) : null
}

export const CanViewWebhooksOfGoal = requireWebhooksPermission({ permission: GoalPermissions.WEBHOOKS_CAN_VIEW, resolveGoalId: goalInQuery })
export const CanCreateWebhook = requireWebhooksPermission({ permission: GoalPermissions.WEBHOOKS_CAN_MANAGE, resolveGoalId: goalInBody })
export const CanManageWebhook = requireWebhooksPermission({ permission: GoalPermissions.WEBHOOKS_CAN_MANAGE, resolveGoalId: webhookInBody })
export const CanViewWebhookDeliveries = requireWebhooksPermission({ permission: GoalPermissions.WEBHOOKS_CAN_VIEW, resolveGoalId: webhookInPath })
export const CanRetryWebhookDelivery = requireWebhooksPermission({ permission: GoalPermissions.WEBHOOKS_CAN_MANAGE, resolveGoalId: deliveryInBody })
