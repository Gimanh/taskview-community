import { Router } from 'express'
import type { Routable } from '../../types/routable.type'
import { ScimAuth } from './middlewares/ScimAuth'
import { ScimController } from './ScimController'

export default class ScimRoutes implements Routable {
  private readonly router: ReturnType<typeof Router>
  private readonly controller: ScimController

  constructor() {
    this.router = Router()
    this.controller = new ScimController()
    this.initRoutes()
  }

  getRouter() {
    return this.router
  }

  initRoutes() {
    this.router.use(ScimAuth)

    this.router.get('/Users', this.controller.listUsers)
    this.router.get('/Users/:id', this.controller.getUser)
    this.router.post('/Users', this.controller.createUser)
    this.router.patch('/Users/:id', this.controller.patchUser)
    this.router.delete('/Users/:id', this.controller.deleteUser)
  }
}
