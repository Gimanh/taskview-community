import { Router } from 'express';
import type { Routable } from '../../types/routable.type';
import { IsLoggedIn } from '../auth/middlewares/is-logged-in';
import GoalsController from './GoalsController';
// import { CanArchiveGoal } from './middlewares/CanArchiveGoal';
import { canAddGoal } from './middlewares/can-add-goal';
import { canDeleteGoal } from './middlewares/can-delete-goal';
import { canEditGoal } from './middlewares/can-edit-goal';
import { canFetchGoals } from './middlewares/can-fetch-goals';

export default class GoalsRoutes implements Routable {
    private readonly router: ReturnType<typeof Router>;
    private readonly goalsController: GoalsController;

    constructor() {
        this.router = Router();
        this.goalsController = new GoalsController();
        this.initRoutes();
    }

    getRouter() {
        return this.router;
    }

    initRoutes() {
        this.router.post('', [IsLoggedIn, canAddGoal], this.goalsController.createGoal);
        this.router.patch('', [IsLoggedIn, canEditGoal], this.goalsController.updateGoalNew);
        this.router.delete('', [IsLoggedIn, canDeleteGoal], this.goalsController.deleteGoalNew);
        this.router.get('', [IsLoggedIn, canFetchGoals], this.goalsController.fetchGoalsNew);
    }
}
