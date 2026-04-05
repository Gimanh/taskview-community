import { Router } from 'express';
import type { Routable } from '../../types/routable.type';
import { IsLoggedIn } from '../auth/middlewares/is-logged-in';
import { IsOrgMemberIfProvided } from '../../middlewares/is-org-member';
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
        this.router.get('/', [IsLoggedIn, IsOrgMemberIfProvided], this.controller.fetch);
        this.router.patch('/read', [IsLoggedIn], this.controller.markRead);
        this.router.patch('/read-all', [IsLoggedIn, IsOrgMemberIfProvided], this.controller.markAllRead);
        this.router.get('/preferences', [IsLoggedIn], this.controller.getPreferences);
        this.router.put('/preferences', [IsLoggedIn], this.controller.savePreferences);
        this.router.get('/connection-token', [IsLoggedIn], this.controller.connectionToken);
        this.router.post('/device/register', [IsLoggedIn], this.controller.registerDevice);
        this.router.post('/device/unregister', [IsLoggedIn], this.controller.unregisterDevice);
    }
}
