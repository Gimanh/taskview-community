import { Router } from 'express'
import type { Routable } from '../../types/routable.type'
import { IsLoggedIn } from '../auth/middlewares/is-logged-in'
import { OrganizationController } from './OrganizationController'
import { IsOrgAdmin } from './middlewares/IsOrgAdmin'
import { IsOrgMember } from './middlewares/IsOrgMember'
import { IsOrgOwner } from './middlewares/IsOrgOwner'

export default class OrganizationRoutes implements Routable {
  private readonly router: ReturnType<typeof Router>
  private readonly controller: OrganizationController

  constructor() {
    this.router = Router()
    this.controller = new OrganizationController()
    this.initRoutes()
  }

  getRouter() {
    return this.router
  }

  initRoutes() {
    this.router.post('', [IsLoggedIn], this.controller.create)
    this.router.get('', [IsLoggedIn], this.controller.fetch)
    this.router.get('/:orgId', [IsLoggedIn, IsOrgMember], this.controller.getById)
    this.router.patch('', [IsLoggedIn, IsOrgAdmin], this.controller.update)
    this.router.delete('', [IsLoggedIn, IsOrgOwner], this.controller.delete)

    this.router.get('/:orgId/members', [IsLoggedIn, IsOrgMember], this.controller.fetchMembers)
    this.router.post('/members', [IsLoggedIn, IsOrgAdmin], this.controller.addMember)
    this.router.patch('/members/role', [IsLoggedIn, IsOrgAdmin], this.controller.updateMemberRole)
    this.router.delete('/members', [IsLoggedIn, IsOrgAdmin], this.controller.removeMember)
  }
}
