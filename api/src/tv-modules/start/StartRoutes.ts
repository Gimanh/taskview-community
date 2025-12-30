import { Router } from 'express';
import type { Routable } from '../../types/routable.type';
import { IsLoggedIn } from '../auth/middlewares/is-logged-in';
import { StartController } from './StartController';

export default class StartRoutes implements Routable {
    private readonly router: ReturnType<typeof Router>;
    private readonly controller: StartController;

    constructor() {
        this.router = Router();
        this.controller = new StartController();
        this.initRoutes();
    }

    getRouter() {
        return this.router;
    }

    initRoutes() {
        this.router.get('/fetch/lists', [IsLoggedIn], this.controller.fetchAllLists);
        this.router.get('/fetchallstate', [IsLoggedIn], this.controller.fetchAllState);
        this.router.get('/search-task', [IsLoggedIn], this.controller.searchTaskInAllProjects);
    }
}
