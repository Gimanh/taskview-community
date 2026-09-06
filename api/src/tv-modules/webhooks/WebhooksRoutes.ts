import { Router } from 'express'
import type { Routable } from '../../types/routable.type'
import { IsLoggedIn } from '../auth/middlewares/is-logged-in'
import { WebhooksController } from './WebhooksController'
import { IsGoalOwnerByGoalId, IsGoalOwnerByWebhookId } from './middlewares/IsGoalOwner'
import { RequireTokenPermission } from '../../middlewares/require-token-permission';
import { GoalPermissions } from '../../types/auth.types';

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
        const canManageWebhooks = RequireTokenPermission(GoalPermissions.WEBHOOKS_CAN_MANAGE)

        this.router.get('', [IsLoggedIn, IsGoalOwnerByGoalId, canManageWebhooks], this.controller.fetch)
        this.router.post('', [IsLoggedIn, IsGoalOwnerByGoalId, canManageWebhooks], this.controller.create)
        this.router.patch('', [IsLoggedIn, IsGoalOwnerByWebhookId, canManageWebhooks], this.controller.update)
        this.router.delete('', [IsLoggedIn, IsGoalOwnerByWebhookId, canManageWebhooks], this.controller.delete)
        this.router.post('/rotate-secret', [IsLoggedIn, IsGoalOwnerByWebhookId, canManageWebhooks], this.controller.rotateSecret)
        this.router.post('/test', [IsLoggedIn, IsGoalOwnerByWebhookId, canManageWebhooks], this.controller.testDelivery)
        this.router.get('/deliveries/:id', [IsLoggedIn, IsGoalOwnerByWebhookId, canManageWebhooks], this.controller.fetchDeliveries)
        this.router.post('/retry', [IsLoggedIn, IsGoalOwnerByWebhookId, canManageWebhooks], this.controller.retryDelivery)
    }
}
