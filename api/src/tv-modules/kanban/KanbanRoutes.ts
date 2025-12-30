import { Router } from 'express';
import type { Routable } from '../../types/routable.type';
import { IsLoggedIn } from '../auth/middlewares/is-logged-in';
import { KanbanController } from './KanbanController';
import { CanManageKanban } from './middlewares/CanManageKanban';
import { CanViewKanban } from './middlewares/CanViewKanban';
import { CanFetchTasks } from './middlewares/CanFetchTasks';
export default class KanbanRoutes implements Routable {
    private readonly router: ReturnType<typeof Router>;
    private readonly kanbanController: KanbanController;

    constructor() {
        this.router = Router();
        this.kanbanController = new KanbanController();
        this.initRoutes();
    }

    getRouter() {
        return this.router;
    }

    initRoutes() {
        this.router.post('/fetch-statuses', [IsLoggedIn, CanViewKanban], this.kanbanController.fetchAllColumns);
        this.router.post('/add-status', [IsLoggedIn, CanManageKanban], this.kanbanController.addStatus);
        this.router.post('/delete-status', [IsLoggedIn, CanManageKanban], this.kanbanController.deleteStatus);
        this.router.post('/update-status', [IsLoggedIn, CanManageKanban], this.kanbanController.updateStatus);

        // this.router.get('columns/:goalId', [IsLoggedIn], this.kanbanController.fetchAllColumns);
        this.router.get('/tasks/:goalId/:columnId/:cursor', [IsLoggedIn, CanViewKanban, CanFetchTasks], this.kanbanController.fetchTasksForColumn);

        //we do not use this route in the client (no logic for this route on the client side)!!!
        this.router.get('/tasks-order/:goalId/:columnId/:cursor', [IsLoggedIn, CanManageKanban], this.kanbanController.getTasksOrderForColumnAndCursor);

        this.router.patch('/update-tasks-order-and-column', [IsLoggedIn, CanManageKanban], this.kanbanController.updateTasksOrderAndColumn);
    }
}
