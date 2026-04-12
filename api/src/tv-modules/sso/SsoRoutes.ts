import { Router } from 'express'
import type { Routable } from '../../types/routable.type'
import { IsLoggedIn } from '../auth/middlewares/is-logged-in'
import { IsOrgAdmin } from '../organizations/middlewares/IsOrgAdmin'
import { IsSsoConfigAdmin } from './middlewares/IsSsoConfigAdmin'
import { SsoController } from './SsoController'

export default class SsoRoutes implements Routable {
  private readonly router: ReturnType<typeof Router>
  private readonly controller: SsoController

  constructor() {
    this.router = Router()
    this.controller = new SsoController()
    this.initRoutes()
  }

  getRouter() {
    return this.router
  }

  initRoutes() {
    this.router.get('/providers', this.controller.listPublicProviders)
    this.router.get('/login/:configId', this.controller.initiateLogin)
    this.router.get('/callback/:configId', this.controller.handleCallback)
    this.router.post('/callback/:configId', this.controller.handleCallback)

    this.router.get('/admin/metadata', [IsLoggedIn], this.controller.parseMetadata)
    this.router.get('/admin/configs', [IsLoggedIn], this.controller.listConfigs)
    this.router.post('/admin/configs', [IsLoggedIn, IsOrgAdmin], this.controller.createConfig)
    this.router.patch('/admin/configs/:configId', [IsLoggedIn, IsSsoConfigAdmin], this.controller.updateConfig)
    this.router.delete('/admin/configs/:configId', [IsLoggedIn, IsSsoConfigAdmin], this.controller.deleteConfig)
  }
}
