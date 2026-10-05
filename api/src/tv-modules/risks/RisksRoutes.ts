import { Router } from 'express';
import type { Routable } from '../../types/routable.type';
import { IsLoggedIn } from '../auth/middlewares/is-logged-in';
import RisksController from './RisksController';

export default class RisksRoutes implements Routable {
    private readonly router: ReturnType<typeof Router>;
    private readonly controller: RisksController;

    constructor() {
        this.router = Router();
        this.controller = new RisksController();
        this.initRoutes();
    }

    getRouter() {
        return this.router;
    }

    initRoutes() {
        this.router.get('/', [IsLoggedIn], this.controller.list);
        this.router.post('/', [IsLoggedIn], this.controller.create);
        this.router.get('/matrix', [IsLoggedIn], this.controller.getMatrix);
        this.router.get('/:id', [IsLoggedIn], this.controller.getOne);
        this.router.patch('/:id', [IsLoggedIn], this.controller.update);
        this.router.delete('/:id', [IsLoggedIn], this.controller.delete);
    }
}
