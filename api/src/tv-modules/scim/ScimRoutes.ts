import { Router } from 'express'
import type { Routable } from '../../types/routable.type'
import { ScimAuth } from './middlewares/ScimAuth'
import { ScimContentType } from './middlewares/ScimContentType'
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
    this.router.use(ScimContentType)
    this.router.use(ScimAuth)

    this.router.get('/ServiceProviderConfig', this.controller.serviceProviderConfig)
    this.router.get('/ResourceTypes', this.controller.resourceTypes)
    this.router.get('/ResourceTypes/:id', this.controller.resourceType)
    this.router.get('/Schemas', this.controller.schemas)
    this.router.get('/Schemas/:id', this.controller.schema)

    this.router.get('/Users', this.controller.listUsers)
    this.router.get('/Users/:id', this.controller.getUser)
    this.router.post('/Users', this.controller.createUser)
    this.router.put('/Users/:id', this.controller.replaceUser)
    this.router.patch('/Users/:id', this.controller.patchUser)
    this.router.delete('/Users/:id', this.controller.deleteUser)

    this.router.get('/Groups', this.controller.listGroups)
    this.router.get('/Groups/:id', this.controller.getGroup)
    this.router.post('/Groups', this.controller.createGroup)
    this.router.put('/Groups/:id', this.controller.replaceGroup)
    this.router.patch('/Groups/:id', this.controller.patchGroup)
    this.router.delete('/Groups/:id', this.controller.deleteGroup)

    this.router.use(this.controller.notFound)
  }
}
