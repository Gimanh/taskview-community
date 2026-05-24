import { Router } from 'express'
import type { Routable } from '../../types/routable.type'
import { IsLoggedIn } from '../auth/middlewares/is-logged-in'
import { UiPreferencesController } from './UiPreferencesController'

export default class UiPreferencesRoutes implements Routable {
  private readonly router: ReturnType<typeof Router>
  private readonly controller: UiPreferencesController

  constructor() {
    this.router = Router()
    this.controller = new UiPreferencesController()
    this.initRoutes()
  }

  getRouter() {
    return this.router
  }

  initRoutes() {
    this.router.get('', [IsLoggedIn], this.controller.get)
    this.router.put('', [IsLoggedIn], this.controller.update)
  }
}
