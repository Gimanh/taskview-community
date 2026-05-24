import { type } from 'arktype'
import type { Request, Response } from 'express'
import { logError } from '../../utils/api'
import { UiPreferencesArkType } from './types'

export class UiPreferencesController {
  get = async (req: Request, res: Response) => {
    const prefs = await req.appUser.uiPreferencesManager.get().catch(logError)
    return res.tvJson(prefs ?? {})
  }

  update = async (req: Request, res: Response) => {
    const out = UiPreferencesArkType(req.body)
    if (out instanceof type.errors) {
      return res.status(400).send(out.summary)
    }
    const prefs = await req.appUser.uiPreferencesManager.update(out).catch(logError)
    if (!prefs) return res.status(500).end()
    return res.tvJson(prefs)
  }
}
