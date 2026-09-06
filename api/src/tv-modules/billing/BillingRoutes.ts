import { Router } from 'express'
import type { Routable } from '../../types/routable.type'
import { IsLoggedIn } from '../auth/middlewares/is-logged-in'
import { IsOrgAdmin } from '../organizations/middlewares/IsOrgAdmin'
import { RequireTokenPermission } from '../../middlewares/require-token-permission'
import { GoalPermissions } from '../../types/auth.types'
import { BillingController } from './BillingController'
import { isOrgAdminForCounterparty, isOrgAdminForSeller } from './middlewares/is-org-admin-for-billing'

export default class BillingRoutes implements Routable {
  private readonly router: ReturnType<typeof Router>
  private readonly controller: BillingController

  constructor() {
    this.router = Router()
    this.controller = new BillingController()
    this.initRoutes()
  }

  getRouter() {
    return this.router
  }

  private initRoutes() {
    const canManage = RequireTokenPermission(GoalPermissions.BILLING_CAN_MANAGE)

    this.router.get('/currencies', [IsLoggedIn], this.controller.currencies)

    this.router.get('/sellers', [IsLoggedIn, IsOrgAdmin, canManage], this.controller.fetchSellers)
    this.router.post('/sellers', [IsLoggedIn, IsOrgAdmin, canManage], this.controller.createSeller)
    this.router.patch('/sellers/:id', [IsLoggedIn, isOrgAdminForSeller, canManage], this.controller.updateSeller)
    this.router.patch('/sellers/:id/archive', [IsLoggedIn, isOrgAdminForSeller, canManage], this.controller.archiveSeller)
    this.router.delete('/sellers/:id', [IsLoggedIn, isOrgAdminForSeller, canManage], this.controller.deleteSeller)

    this.router.get('/counterparties', [IsLoggedIn, IsOrgAdmin, canManage], this.controller.fetchCounterparties)
    this.router.post('/counterparties', [IsLoggedIn, IsOrgAdmin, canManage], this.controller.createCounterparty)
    this.router.patch('/counterparties/:id', [IsLoggedIn, isOrgAdminForCounterparty, canManage], this.controller.updateCounterparty)
    this.router.patch('/counterparties/:id/archive', [IsLoggedIn, isOrgAdminForCounterparty, canManage], this.controller.archiveCounterparty)
    this.router.delete('/counterparties/:id', [IsLoggedIn, isOrgAdminForCounterparty, canManage], this.controller.deleteCounterparty)
  }
}
