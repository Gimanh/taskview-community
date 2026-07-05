import { Router } from 'express'
import type { Routable } from '../../types/routable.type'
import { IsLoggedIn } from '../auth/middlewares/is-logged-in'
import { RejectApiTokenAuth } from '../api-tokens/middlewares/RejectApiTokenAuth'
import { MessagingController } from './MessagingController'
import { VerifyTelegramWebhook } from './middlewares/VerifyTelegramWebhook'
import { VerifySlackRequest } from './middlewares/VerifySlackRequest'
import { CanManageProjectMessaging, CanViewProjectMessaging } from './middlewares/ProjectMessagingPermission'

export default class MessagingRoutes implements Routable {
    private readonly router: ReturnType<typeof Router>
    private readonly controller: MessagingController

    constructor() {
        this.router = Router()
        this.controller = new MessagingController()
        this.initRoutes()
    }

    getRouter() {
        return this.router
    }

    initRoutes() {
        // Personal (per-user) connections — scoped to the authenticated user.
        this.router.get('', [IsLoggedIn, RejectApiTokenAuth], this.controller.fetch)
        this.router.patch('/toggle', [IsLoggedIn, RejectApiTokenAuth], this.controller.toggle)
        this.router.patch('/events', [IsLoggedIn, RejectApiTokenAuth], this.controller.updateEvents)
        this.router.delete('', [IsLoggedIn, RejectApiTokenAuth], this.controller.delete)
        this.router.get('/:provider/connect-link', [IsLoggedIn, RejectApiTokenAuth], this.controller.connectLink)

        // Project connections — guarded by project ownership (goalId in body/query).
        this.router.get('/project', [IsLoggedIn, RejectApiTokenAuth, CanViewProjectMessaging], this.controller.fetchProject)
        this.router.patch('/project/toggle', [IsLoggedIn, RejectApiTokenAuth, CanManageProjectMessaging], this.controller.toggleProject)
        this.router.patch('/project/events', [IsLoggedIn, RejectApiTokenAuth, CanManageProjectMessaging], this.controller.updateProjectEvents)
        this.router.patch('/project/post-content', [IsLoggedIn, RejectApiTokenAuth, CanManageProjectMessaging], this.controller.updateProjectPostContent)
        this.router.delete('/project', [IsLoggedIn, RejectApiTokenAuth, CanManageProjectMessaging], this.controller.deleteProject)
        this.router.get('/project/:provider/connect-link', [IsLoggedIn, RejectApiTokenAuth, CanManageProjectMessaging], this.controller.projectConnectLink)

        // Slack OAuth — public (auth carried by the JWT ?token on start and the signed state on callback).
        this.router.get('/slack/oauth/start', this.controller.slackOAuthStart)
        this.router.get('/slack/oauth/callback', this.controller.slackOAuthCallback)

        // Inbound webhook — public, protected by the Telegram secret-token header.
        this.router.post('/telegram/webhook', [VerifyTelegramWebhook], this.controller.telegramWebhook)

        // Slack inbound (slash commands + interactivity) — public, protected by the Slack signature.
        this.router.post('/slack/commands', [VerifySlackRequest], this.controller.slackCommands)
        this.router.post('/slack/interactivity', [VerifySlackRequest], this.controller.slackInteractivity)
    }
}
