import { Router } from 'express'
import type { Routable } from '../../types/routable.type'
import { RejectApiTokenAuth } from '../api-tokens/middlewares/RejectApiTokenAuth'
import { IsLoggedIn } from '../auth/middlewares/is-logged-in'
import { OnboardingController } from './OnboardingController'

export default class OnboardingRoutes implements Routable {
  private readonly router: ReturnType<typeof Router>
  private readonly controller: OnboardingController

  constructor() {
    this.router = Router()
    this.controller = new OnboardingController()
    this.initRoutes()
  }

  getRouter() {
    return this.router
  }

  initRoutes() {
    this.router.get('', [IsLoggedIn, RejectApiTokenAuth], this.controller.get)
    this.router.post('/finish', [IsLoggedIn, RejectApiTokenAuth], this.controller.finish)
  }
}
