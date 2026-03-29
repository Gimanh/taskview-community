import type { Request, Response } from 'express'
import { ArkErrors } from 'arktype'
import { SessionDeleteSchema } from './types'

export class SessionsController {
  fetch = async (req: Request, res: Response) => {
    const userId = req.appUser.getUserData()?.id
    if (!userId) return res.status(401).end()

    const currentSessionId = req.appUser.getTokenId()
    const sessions = await req.appUser.authManager.sessionStorage.fetchUserSessions(userId)

    const result = sessions.map((s) => ({
      id: s.id,
      deviceName: s.deviceName,
      userIp: s.userIp,
      createdAt: s.timeCreation,
      lastUsedAt: s.lastUsedAt,
      isCurrent: s.id === currentSessionId,
    }))

    return res.tvJson(result)
  }

  delete = async (req: Request, res: Response) => {
    const data = SessionDeleteSchema(req.body)
    if (data instanceof ArkErrors) {
      return res.status(400).send(data.summary)
    }

    const userId = req.appUser.getUserData()?.id
    if (!userId) return res.status(401).end()

    const currentSessionId = req.appUser.getTokenId()
    if (data.id === currentSessionId) {
      return res.status(400).send('Cannot delete current session')
    }

    const result = await req.appUser.authManager.sessionStorage.deleteSession(data.id, userId)
    return res.tvJson(result)
  }

  deleteAll = async (req: Request, res: Response) => {
    const userId = req.appUser.getUserData()?.id
    if (!userId) return res.status(401).end()

    const currentSessionId = req.appUser.getTokenId()
    const result = await req.appUser.authManager.sessionStorage.deleteAllSessions(userId, currentSessionId)
    return res.tvJson(result)
  }
}
