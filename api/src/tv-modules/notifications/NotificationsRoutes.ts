import { Router } from 'express';
import type { Routable } from '../../types/routable.type';
import { IsLoggedIn } from '../auth/middlewares/is-logged-in';
import { NotificationsController } from './NotificationsController';

export default class NotificationsRoutes implements Routable {
    private readonly router: ReturnType<typeof Router>;
    private readonly controller: NotificationsController;

    constructor() {
        this.router = Router();
        this.controller = new NotificationsController();
        this.initRoutes();
    }

    getRouter() {
        return this.router;
    }

    initRoutes() {
        this.router.get('/', [IsLoggedIn], this.controller.fetch);
        this.router.patch('/read', [IsLoggedIn], this.controller.markRead);
        this.router.patch('/read-all', [IsLoggedIn], this.controller.markAllRead);
        this.router.get('/connection-token', [IsLoggedIn], this.controller.connectionToken);
    }
}
