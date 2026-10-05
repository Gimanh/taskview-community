import { Router } from 'express';
import type { Routable } from '../../types/routable.type';
import { IsLoggedIn } from '../auth/middlewares/is-logged-in';
import ProgressReportsController from './ProgressReportsController';

export default class ProgressReportsRoutes implements Routable {
    private readonly router: ReturnType<typeof Router>;
    private readonly controller: ProgressReportsController;

    constructor() {
        this.router = Router();
        this.controller = new ProgressReportsController();
        this.initRoutes();
    }

    getRouter() {
        return this.router;
    }

    initRoutes() {
        this.router.get('/projects/:goalId/cadence', [IsLoggedIn], this.controller.getCadence);
        this.router.put('/projects/:goalId/cadence', [IsLoggedIn], this.controller.saveCadence);
        this.router.get('/projects/:goalId/reports', [IsLoggedIn], this.controller.listReports);
        this.router.post('/reports', [IsLoggedIn], this.controller.createReport);
        this.router.post('/projects/:goalId/remind', [IsLoggedIn], this.controller.triggerReminder);
    }
}
