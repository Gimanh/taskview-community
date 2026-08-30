import { Router } from 'express'
import type { Routable } from '../../types/routable.type'
import { IsLoggedIn } from '../auth/middlewares/is-logged-in'
import { RejectApiTokenAuth } from '../api-tokens/middlewares/RejectApiTokenAuth'
import { OAuthController } from './OAuthController'

export default class OAuthRoutes implements Routable {
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
        this.router.get('/authorize', this.controller.authorize)
        this.router.post('/token', this.controller.token)
        this.router.post('/revoke', this.controller.revoke)
        this.router.post('/register', this.controller.register)

        // Consent is the one place a real human decides. It must be a browser
        // session, never an API token acting on the user's behalf.
        this.router.post('/consent', [IsLoggedIn, RejectApiTokenAuth], this.controller.consent)
        this.router.post('/consent/deny', [IsLoggedIn, RejectApiTokenAuth], this.controller.denyConsent)

        this.router.get('/connected-apps', [IsLoggedIn, RejectApiTokenAuth], this.controller.fetchConnectedApps)
        this.router.delete('/connected-apps', [IsLoggedIn, RejectApiTokenAuth], this.controller.revokeConnectedApp)
    }
}
