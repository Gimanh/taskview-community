import type { NextFunction, Request, Response } from 'express'
import { eq } from 'drizzle-orm'
import { GoalsSchema, WebhooksSchema } from 'taskview-db-schemas'
import { Database } from '../../../modules/db'

export const IsGoalOwnerByGoalId = async (req: Request, res: Response, next: NextFunction) => {
  const goalId = Number(req.body.goalId || req.query.goalId)
  const userId = req.appUser.getUserData()?.id

  if (!goalId || !userId) return res.status(400).end()

  const db = Database.getInstance()
  const goals = await db.dbDrizzle
    .select({ owner: GoalsSchema.owner })
    .from(GoalsSchema)
    .where(eq(GoalsSchema.id, goalId))

  if (!goals.length || goals[0].owner !== userId) return res.status(403).end()

  next()
}

export const IsGoalOwnerByWebhookId = async (req: Request, res: Response, next: NextFunction) => {
  const webhookId = Number(req.body.id || req.params.id)
  const userId = req.appUser.getUserData()?.id

  if (!webhookId || !userId) return res.status(400).end()

  const db = Database.getInstance()
  const result = await db.dbDrizzle
    .select({ owner: GoalsSchema.owner })
    .from(WebhooksSchema)
    .innerJoin(GoalsSchema, eq(WebhooksSchema.goalId, GoalsSchema.id))
    .where(eq(WebhooksSchema.id, webhookId))

  if (!result.length || result[0].owner !== userId) return res.status(403).end()

  next()
}
