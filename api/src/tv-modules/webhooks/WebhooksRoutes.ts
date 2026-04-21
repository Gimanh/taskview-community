import { Router } from 'express'
import type { Routable } from '../../types/routable.type'
import { IsLoggedIn } from '../auth/middlewares/is-logged-in'
import { WebhooksController } from './WebhooksController'
import { IsGoalOwnerByGoalId, IsGoalOwnerByWebhookId } from './middlewares/IsGoalOwner'

export default class WebhooksRoutes implements Routable {
    private readonly router: ReturnType<typeof Router>
    private readonly controller: WebhooksController

    constructor() {
        this.router = Router()
        this.controller = new WebhooksController()
        this.initRoutes()
    }

    getRouter() {
        return this.router
    }

    initRoutes() {
        this.router.get('', [IsLoggedIn, IsGoalOwnerByGoalId], this.controller.fetch)
        this.router.post('', [IsLoggedIn, IsGoalOwnerByGoalId], this.controller.create)
        this.router.patch('', [IsLoggedIn, IsGoalOwnerByWebhookId], this.controller.update)
        this.router.delete('', [IsLoggedIn, IsGoalOwnerByWebhookId], this.controller.delete)
        this.router.post('/rotate-secret', [IsLoggedIn, IsGoalOwnerByWebhookId], this.controller.rotateSecret)
        this.router.post('/test', [IsLoggedIn, IsGoalOwnerByWebhookId], this.controller.testDelivery)
        this.router.get('/deliveries/:id', [IsLoggedIn, IsGoalOwnerByWebhookId], this.controller.fetchDeliveries)
        this.router.post('/retry', [IsLoggedIn, IsGoalOwnerByWebhookId], this.controller.retryDelivery)
    }
}
