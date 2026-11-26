import { type } from 'arktype'
import type { Request, Response } from 'express'
import { logError } from '../../utils/api'
import { FinishOnboardingArkType } from './types'

export class OnboardingController {
  get = async (req: Request, res: Response) => {
    const state = await req.appUser.onboardingManager.get().catch(logError)
    if (!state) return res.status(500).end()
    return res.tvJson(state)
  }

  finish = async (req: Request, res: Response) => {
    const out = FinishOnboardingArkType(req.body)
    if (out instanceof type.errors) {
      return res.status(400).send(out.summary)
    }
    const state = await req.appUser.onboardingManager.finish(out.status).catch(logError)
    if (!state) return res.status(500).end()
    return res.tvJson(state)
  }
}
