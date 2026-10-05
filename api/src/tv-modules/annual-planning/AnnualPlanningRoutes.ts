import { Router } from 'express';
import type { Routable } from '../../types/routable.type';
import { IsLoggedIn } from '../auth/middlewares/is-logged-in';
import AnnualPlanningController from './AnnualPlanningController';

export default class AnnualPlanningRoutes implements Routable {
    private readonly router: ReturnType<typeof Router>;
    private readonly controller: AnnualPlanningController;

    constructor() {
        this.router = Router();
        this.controller = new AnnualPlanningController();
        this.initRoutes();
    }

    getRouter() {
        return this.router;
    }

    initRoutes() {
        // Cycles
        this.router.get('/cycles', [IsLoggedIn], this.controller.listCycles);
        this.router.post('/cycles', [IsLoggedIn], this.controller.createCycle);
        this.router.patch('/cycles/:id', [IsLoggedIn], this.controller.updateCycle);
        this.router.delete('/cycles/:id', [IsLoggedIn], this.controller.deleteCycle);

        // Proposals
        this.router.get('/proposals', [IsLoggedIn], this.controller.listProposals);
        this.router.post('/proposals', [IsLoggedIn], this.controller.createProposal);
        this.router.patch('/proposals/:id', [IsLoggedIn], this.controller.updateProposal);
        this.router.delete('/proposals/:id', [IsLoggedIn], this.controller.deleteProposal);
        this.router.post('/proposals/:id/promote', [IsLoggedIn], this.controller.promoteToProject);
    }
}
