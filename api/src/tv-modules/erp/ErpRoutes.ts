import { Router } from 'express';
import type { Routable } from '../../types/routable.type';
import { IsLoggedIn } from '../auth/middlewares/is-logged-in';
import ErpController from './ErpController';

export default class ErpRoutes implements Routable {
    private readonly router: ReturnType<typeof Router>;
    private readonly controller: ErpController;

    constructor() {
        this.router = Router();
        this.controller = new ErpController();
        this.initRoutes();
    }

    getRouter() {
        return this.router;
    }

    initRoutes() {
        // ERP Configuration
        this.router.get('/config', [IsLoggedIn], this.controller.getConfig);
        this.router.post('/config', [IsLoggedIn], this.controller.saveConfig);

        // Portfolio-level overview
        this.router.get('/overview', [IsLoggedIn], this.controller.getOrgOverview);

        // Project Budget
        this.router.get('/projects/:goalId', [IsLoggedIn], this.controller.getBudgetForGoal);
        this.router.patch('/projects/:goalId', [IsLoggedIn], this.controller.updateBudget);
        this.router.post('/projects/:goalId/sync', [IsLoggedIn], this.controller.syncFromErp);
        this.router.post('/budgets/:budgetId/transactions', [IsLoggedIn], this.controller.addTransaction);

        // Inbound Webhook from ERP
        this.router.post('/webhook', this.controller.webhook);
    }
}
