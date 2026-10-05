import { Router } from 'express';
import type { Routable } from '../../types/routable.type';
import { IsLoggedIn } from '../auth/middlewares/is-logged-in';
import StagegatesController from './StagegatesController';

export default class StagegatesRoutes implements Routable {
    private readonly router: ReturnType<typeof Router>;
    private readonly controller: StagegatesController;

    constructor() {
        this.router = Router();
        this.controller = new StagegatesController();
        this.initRoutes();
    }

    getRouter() {
        return this.router;
    }

    initRoutes() {
        this.router.get('/goal/:goalId', [IsLoggedIn], this.controller.list);
        this.router.post('/', [IsLoggedIn], this.controller.create);
        this.router.get('/:id', [IsLoggedIn], this.controller.getOne);
        this.router.patch('/:id', [IsLoggedIn], this.controller.update);
        this.router.delete('/:id', [IsLoggedIn], this.controller.delete);
        this.router.get('/:id/progress', [IsLoggedIn], this.controller.getProgress);
        this.router.post('/:id/tasks', [IsLoggedIn], this.controller.assignTask);
        this.router.delete('/:id/tasks/:taskId', [IsLoggedIn], this.controller.unassignTask);
        this.router.post('/:id/submit', [IsLoggedIn], this.controller.submitForReview);
        this.router.post('/:id/decide', [IsLoggedIn], this.controller.decideApproval);
    }
}
