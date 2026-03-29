import { Router } from 'express'
import type { Routable } from '../../types/routable.type'
import { IsLoggedIn } from '../auth/middlewares/is-logged-in'
import { RejectApiTokenAuth } from '../api-tokens/middlewares/RejectApiTokenAuth'
import { SessionsController } from './SessionsController'

export default class SessionsRoutes implements Routable {
  private readonly router: ReturnType<typeof Router>
  private readonly controller: SessionsController

  constructor() {
    this.router = Router()
    this.controller = new SessionsController()
    this.initRoutes()
  }

  getRouter() {
    return this.router
  }

  initRoutes() {
    this.router.get('', [IsLoggedIn, RejectApiTokenAuth], this.controller.fetch)
    this.router.delete('', [IsLoggedIn, RejectApiTokenAuth], this.controller.delete)
    this.router.delete('/all', [IsLoggedIn, RejectApiTokenAuth], this.controller.deleteAll)
  }
}
