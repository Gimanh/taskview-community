import { Router } from 'express'
import type { Routable } from '../../types/routable.type'
import { OAuthController } from './OAuthController'

/**
 * RFC 8414 / RFC 9728 discovery. These must sit at the origin root, not under
 * /module, because that is where clients look before they have any credentials.
 */
export default class OAuthWellKnownRoutes implements Routable {
    private readonly router: ReturnType<typeof Router>
    private readonly controller: OAuthController

    constructor() {
        this.router = Router()
        this.controller = new OAuthController()
        this.initRoutes()
    }

    getRouter() {
        return this.router
    }

    initRoutes() {
        this.router.get('/oauth-authorization-server', this.controller.authorizationServerMetadata)
        this.router.get('/oauth-protected-resource', this.controller.protectedResourceMetadata)
    }
}
