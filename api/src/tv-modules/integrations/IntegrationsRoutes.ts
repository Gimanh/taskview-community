import { Router } from 'express';
import type { Routable } from '../../types/routable.type';
import { IsLoggedIn } from '../auth/middlewares/is-logged-in';
import IntegrationsController from './IntegrationsController';
import { CanManageIntegrations } from './middlewares/CanManageIntegrations';
import { CanViewIntegrations } from './middlewares/CanViewIntegrations';
import { IntegrationAccessTargets } from './middlewares/integrationAccessTargets';

export default class IntegrationsRoutes implements Routable {
    private readonly router: ReturnType<typeof Router>;
    private readonly controller: IntegrationsController;

    constructor() {
        this.router = Router();
        this.controller = new IntegrationsController();
        this.initRoutes();
    }

    getRouter() {
        return this.router;
    }

    initRoutes() {
        this.router.get('', [IsLoggedIn, CanViewIntegrations(IntegrationAccessTargets.projectFromQuery)], this.controller.fetchIntegrations);
        this.router.post('', [IsLoggedIn, CanManageIntegrations(IntegrationAccessTargets.projectFromBody)], this.controller.createIntegration);
        this.router.delete('', [IsLoggedIn, CanManageIntegrations(IntegrationAccessTargets.integrationFromBodyId)], this.controller.deleteIntegration);
        this.router.patch('/toggle', [IsLoggedIn, CanManageIntegrations(IntegrationAccessTargets.integrationFromBodyId)], this.controller.toggleIntegration);
        this.router.patch('/select-repo', [IsLoggedIn, CanManageIntegrations(IntegrationAccessTargets.integrationFromBody)], this.controller.selectRepo);
        this.router.post('/sync', [IsLoggedIn, CanManageIntegrations(IntegrationAccessTargets.integrationFromBody)], this.controller.syncIntegration);
        this.router.get('/repos', [IsLoggedIn, CanViewIntegrations(IntegrationAccessTargets.integrationFromQuery)], this.controller.fetchRepos);
        this.router.get('/oauth/:provider', this.controller.initiateOAuth);
        this.router.get('/oauth/:provider/callback', this.controller.handleOAuthCallback);
        this.router.post('/webhook/github', this.controller.handleGitHubWebhook);
        this.router.post('/webhook/gitlab', this.controller.handleGitLabWebhook);
        this.router.post('/webhook/gitea', this.controller.handleGiteaWebhook);
    }
}
