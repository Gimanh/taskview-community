import { Router } from 'express'
import type { Routable } from '../../types/routable.type'
import { IsLoggedIn } from '../auth/middlewares/is-logged-in'
import { IsOrgAdmin } from '../organizations/middlewares/IsOrgAdmin'
import { RequireTokenPermission } from '../../middlewares/require-token-permission'
import { GoalPermissions } from '../../types/auth.types'
import { InvoicesController } from './InvoicesController'
import { isOrgAdminForInvoice } from './middlewares/is-org-admin-for-invoice'

export default class InvoicesRoutes implements Routable {
  private readonly router: ReturnType<typeof Router>
  private readonly controller: InvoicesController

  constructor() {
    this.router = Router()
    this.controller = new InvoicesController()
    this.initRoutes()
  }

  getRouter() {
    return this.router
  }

  private initRoutes() {
    const canManage = RequireTokenPermission(GoalPermissions.BILLING_CAN_MANAGE)

    this.router.get('', [IsLoggedIn, IsOrgAdmin, canManage], this.controller.fetch)
    this.router.post('', [IsLoggedIn, IsOrgAdmin, canManage], this.controller.create)
    this.router.get('/:id', [IsLoggedIn, isOrgAdminForInvoice, canManage], this.controller.getById)
    this.router.patch('/:id', [IsLoggedIn, isOrgAdminForInvoice, canManage], this.controller.update)
    this.router.patch('/:id/status', [IsLoggedIn, isOrgAdminForInvoice, canManage], this.controller.setStatus)
    this.router.post('/:id/reissue', [IsLoggedIn, isOrgAdminForInvoice, canManage], this.controller.reissue)
    this.router.get('/:id/pdf', [IsLoggedIn, isOrgAdminForInvoice, canManage], this.controller.pdf)
    this.router.delete('/:id', [IsLoggedIn, isOrgAdminForInvoice, canManage], this.controller.delete)
  }
}
