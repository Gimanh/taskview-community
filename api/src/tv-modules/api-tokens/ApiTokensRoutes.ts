import { Router } from 'express';
import type { Routable } from '../../types/routable.type';
import { IsLoggedIn } from '../auth/middlewares/is-logged-in';
import { ApiTokensController } from './ApiTokensController';
import { RejectApiTokenAuth } from './middlewares/RejectApiTokenAuth';

export default class ApiTokensRoutes implements Routable {
    private readonly router: ReturnType<typeof Router>;
    private readonly controller: ApiTokensController;

    constructor() {
        this.router = Router();
        this.controller = new ApiTokensController();
        this.initRoutes();
    }

    getRouter() {
        return this.router;
    }

    initRoutes() {
        this.router.get('', [IsLoggedIn, RejectApiTokenAuth], this.controller.fetch);
        this.router.post('', [IsLoggedIn, RejectApiTokenAuth], this.controller.create);
        this.router.delete('', [IsLoggedIn, RejectApiTokenAuth], this.controller.delete);
        this.router.get('/permissions', [IsLoggedIn, RejectApiTokenAuth], this.controller.fetchPermissions);
    }
}
