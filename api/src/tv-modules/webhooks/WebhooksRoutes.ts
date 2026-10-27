import { Router } from 'express'
import type { Routable } from '../../types/routable.type'
import { IsLoggedIn } from '../auth/middlewares/is-logged-in'
import { WebhooksController } from './WebhooksController'
import {
    CanCreateWebhook,
    CanManageWebhook,
    CanRetryWebhookDelivery,
    CanViewWebhookDeliveries,
    CanViewWebhooksOfGoal,
} from './middlewares/WebhooksPermission'

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
        this.router.get('', [IsLoggedIn, CanViewWebhooksOfGoal], this.controller.fetch)
        this.router.post('', [IsLoggedIn, CanCreateWebhook], this.controller.create)
        this.router.patch('', [IsLoggedIn, CanManageWebhook], this.controller.update)
        this.router.delete('', [IsLoggedIn, CanManageWebhook], this.controller.delete)
        this.router.post('/rotate-secret', [IsLoggedIn, CanManageWebhook], this.controller.rotateSecret)
        this.router.post('/test', [IsLoggedIn, CanManageWebhook], this.controller.testDelivery)
        this.router.get('/deliveries/:id', [IsLoggedIn, CanViewWebhookDeliveries], this.controller.fetchDeliveries)
        this.router.post('/retry', [IsLoggedIn, CanRetryWebhookDelivery], this.controller.retryDelivery)
    }
}
