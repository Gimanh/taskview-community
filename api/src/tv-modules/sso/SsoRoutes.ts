import { Router } from 'express'
import type { Routable } from '../../types/routable.type'
import { IsLoggedIn } from '../auth/middlewares/is-logged-in'
import { IsOrgAdmin } from '../organizations/middlewares/IsOrgAdmin'
import { IsSsoConfigAdmin } from './middlewares/IsSsoConfigAdmin'
import { RequireLoginMethod } from '../auth/middlewares/require-login-method'
import { SsoController } from './SsoController'
import { RequireTokenPermission } from '../../middlewares/require-token-permission'
import { GoalPermissions } from '../../types/auth.types'

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
    this.router.get('/providers', [RequireLoginMethod('sso')], this.controller.listPublicProviders)
    this.router.get('/login/:configId', [RequireLoginMethod('sso')], this.controller.initiateLogin)
    this.router.get('/callback/:configId', [RequireLoginMethod('sso')], this.controller.handleCallback)
    this.router.post('/callback/:configId', [RequireLoginMethod('sso')], this.controller.handleCallback)

    const canManageSso = RequireTokenPermission(GoalPermissions.SSO_CAN_MANAGE)

    this.router.get('/admin/public-urls', [IsLoggedIn], this.controller.getPublicUrls)
    this.router.get('/admin/metadata', [IsLoggedIn, IsOrgAdmin, canManageSso], this.controller.parseMetadata)
    this.router.get('/admin/configs', [IsLoggedIn, IsOrgAdmin, canManageSso], this.controller.listConfigs)
    this.router.post('/admin/configs', [IsLoggedIn, IsOrgAdmin, canManageSso], this.controller.createConfig)
    this.router.patch('/admin/configs/:configId', [IsLoggedIn, IsSsoConfigAdmin, canManageSso], this.controller.updateConfig)
    this.router.delete('/admin/configs/:configId', [IsLoggedIn, IsSsoConfigAdmin, canManageSso], this.controller.deleteConfig)
    this.router.post('/admin/configs/:configId/verify-domain', [IsLoggedIn, IsSsoConfigAdmin, canManageSso], this.controller.startDomainVerification)
    this.router.post('/admin/configs/:configId/verify-domain/check', [IsLoggedIn, IsSsoConfigAdmin, canManageSso], this.controller.checkDomainVerification)
    this.router.post('/admin/configs/:configId/scim-token', [IsLoggedIn, IsSsoConfigAdmin, canManageSso], this.controller.generateScimToken)
    this.router.patch('/admin/configs/:configId/scim', [IsLoggedIn, IsSsoConfigAdmin, canManageSso], this.controller.toggleScim)
  }
}
