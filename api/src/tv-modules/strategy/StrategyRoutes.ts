import { Router } from 'express';
import type { Routable } from '../../types/routable.type';
import { IsLoggedIn } from '../auth/middlewares/is-logged-in';
import StrategyController from './StrategyController';

export default class StrategyRoutes implements Routable {
    private readonly router: ReturnType<typeof Router>;
    private readonly controller: StrategyController;

    constructor() {
        this.router = Router();
        this.controller = new StrategyController();
        this.initRoutes();
    }

    getRouter() {
        return this.router;
    }

    initRoutes() {
        // Multi-tier Dashboard
        this.router.get('/dashboard', [IsLoggedIn], this.controller.getDashboard);

        // Objectives
        this.router.get('/objectives', [IsLoggedIn], this.controller.listObjectives);
        this.router.post('/objectives', [IsLoggedIn], this.controller.createObjective);
        this.router.patch('/objectives/:id', [IsLoggedIn], this.controller.updateObjective);
        this.router.delete('/objectives/:id', [IsLoggedIn], this.controller.deleteObjective);

        // Initiatives
        this.router.get('/initiatives', [IsLoggedIn], this.controller.listInitiatives);
        this.router.post('/initiatives', [IsLoggedIn], this.controller.createInitiative);
        this.router.patch('/initiatives/:id', [IsLoggedIn], this.controller.updateInitiative);
        this.router.delete('/initiatives/:id', [IsLoggedIn], this.controller.deleteInitiative);
        this.router.post('/initiatives/:id/projects', [IsLoggedIn], this.controller.linkProject);
        this.router.delete('/initiatives/:id/projects/:goalId', [IsLoggedIn], this.controller.unlinkProject);

        // KPIs
        this.router.get('/kpis', [IsLoggedIn], this.controller.listKpis);
        this.router.post('/kpis', [IsLoggedIn], this.controller.createKpi);
        this.router.patch('/kpis/:id', [IsLoggedIn], this.controller.updateKpi);
        this.router.delete('/kpis/:id', [IsLoggedIn], this.controller.deleteKpi);
    }
}
