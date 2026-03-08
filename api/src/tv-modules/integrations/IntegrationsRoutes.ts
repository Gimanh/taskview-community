import { Router } from 'express';
import type { Routable } from '../../types/routable.type';
import { IsLoggedIn } from '../auth/middlewares/is-logged-in';
import IntegrationsController from './IntegrationsController';
import { CanManageIntegrations } from './middlewares/CanManageIntegrations';
import { CanViewIntegrations } from './middlewares/CanViewIntegrations';

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
        this.router.get('', [IsLoggedIn, CanViewIntegrations], this.controller.fetchIntegrations);
        this.router.post('', [IsLoggedIn, CanManageIntegrations], this.controller.createIntegration);
        this.router.delete('', [IsLoggedIn, CanManageIntegrations], this.controller.deleteIntegration);
        this.router.patch('/toggle', [IsLoggedIn, CanManageIntegrations], this.controller.toggleIntegration);
        this.router.patch('/select-repo', [IsLoggedIn, CanManageIntegrations], this.controller.selectRepo);
        this.router.post('/sync', [IsLoggedIn, CanManageIntegrations], this.controller.syncIntegration);
        this.router.get('/repos', [IsLoggedIn, CanViewIntegrations], this.controller.fetchRepos);
        this.router.get('/oauth/:provider', this.controller.initiateOAuth);
        this.router.get('/oauth/:provider/callback', this.controller.handleOAuthCallback);
        this.router.post('/webhook/github', this.controller.handleGitHubWebhook);
        this.router.post('/webhook/gitlab', this.controller.handleGitLabWebhook);
    }
}
