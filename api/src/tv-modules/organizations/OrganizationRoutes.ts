import { Router } from 'express'
import type { Routable } from '../../types/routable.type'
import { IsLoggedIn } from '../auth/middlewares/is-logged-in'
import { OrganizationController } from './OrganizationController'
import { IsOrgAdmin } from './middlewares/IsOrgAdmin'
import { IsOrgMember } from './middlewares/IsOrgMember'
import { IsOrgOwner } from './middlewares/IsOrgOwner'
import { RequireTokenPermission } from '../../middlewares/require-token-permission'
import { GoalPermissions } from '../../types/auth.types'

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
    const canManage = RequireTokenPermission(GoalPermissions.ORG_CAN_MANAGE)
    const canManageMembers = RequireTokenPermission(GoalPermissions.ORG_CAN_MANAGE_MEMBERS)
    const canView = RequireTokenPermission(GoalPermissions.ORG_CAN_VIEW)

    this.router.post('', [IsLoggedIn, canManage], this.controller.create)
    this.router.get('', [IsLoggedIn], this.controller.fetch)

    this.router.post('/members', [IsLoggedIn, IsOrgAdmin, canManageMembers], this.controller.addMember)
    this.router.patch('/members/role', [IsLoggedIn, IsOrgAdmin, canManageMembers], this.controller.updateMemberRole)
    this.router.delete('/members', [IsLoggedIn, IsOrgAdmin, canManageMembers], this.controller.removeMember)

    this.router.get('/:orgId', [IsLoggedIn, IsOrgMember, canView], this.controller.getById)
    this.router.patch('/:orgId', [IsLoggedIn, IsOrgAdmin, canManage], this.controller.update)
    this.router.delete('/:orgId', [IsLoggedIn, IsOrgOwner, canManage], this.controller.delete)
    this.router.get('/:orgId/members', [IsLoggedIn, IsOrgAdmin, canView], this.controller.fetchMembers)
  }
}
