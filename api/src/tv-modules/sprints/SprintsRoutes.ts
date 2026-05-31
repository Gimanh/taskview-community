import { Router } from 'express';
import type { Routable } from '../../types/routable.type';
import { IsLoggedIn } from '../auth/middlewares/is-logged-in';
import SprintsController from './SprintsController';
import { canAssignSprintTasks } from './middlewares/can-assign-sprint-tasks';
import { canManageSprints } from './middlewares/can-manage-sprints';
import { canViewSprintAnalytics } from './middlewares/can-view-sprint-analytics';
import { canViewSprints } from './middlewares/can-view-sprints';

export default class SprintsRoutes implements Routable {
    private readonly router: ReturnType<typeof Router>;
    private readonly controller: SprintsController;

    constructor() {
        this.router = Router();
        this.controller = new SprintsController();
        this.initRoutes();
    }

    getRouter() {
        return this.router;
    }

    initRoutes() {
        // Create
        this.router.post('', [IsLoggedIn, canManageSprints], this.controller.create);

        // Analytics
        this.router.get('/sprint/:sprintId/burndown', [IsLoggedIn, canViewSprintAnalytics], this.controller.burndown);
        this.router.get('/goal/:goalId/velocity', [IsLoggedIn, canViewSprintAnalytics], this.controller.velocity);

        // Cadence: per-project auto-generation config (Linear-style)
        this.router.get('/goal/:goalId/cadence', [IsLoggedIn, canViewSprints], this.controller.getCadence);
        this.router.put('/goal/:goalId/cadence', [IsLoggedIn, canManageSprints], this.controller.setCadence);

        // Cursor-paginated planning task lists (?scope=backlog|sprint&cursor=&limit=)
        this.router.get('/sprint/:sprintId/planning', [IsLoggedIn, canViewSprints], this.controller.planning);

        // Single sprint detail + lifecycle
        this.router.get('/sprint/:sprintId', [IsLoggedIn, canViewSprints], this.controller.getOne);
        this.router.patch('/sprint/:sprintId', [IsLoggedIn, canManageSprints], this.controller.update);
        this.router.post('/sprint/:sprintId/activate', [IsLoggedIn, canManageSprints], this.controller.activate);
        this.router.post('/sprint/:sprintId/review', [IsLoggedIn, canManageSprints], this.controller.review);
        this.router.post('/sprint/:sprintId/close', [IsLoggedIn, canManageSprints], this.controller.close);
        this.router.post('/sprint/:sprintId/pause', [IsLoggedIn, canManageSprints], this.controller.pause);
        this.router.post('/sprint/:sprintId/resume', [IsLoggedIn, canManageSprints], this.controller.resume);
        this.router.delete('/sprint/:sprintId', [IsLoggedIn, canManageSprints], this.controller.remove);
        this.router.put('/sprint/:sprintId/retro', [IsLoggedIn, canManageSprints], this.controller.saveRetro);

        // Assign a task to / out of a sprint (business boundary lives here, not in tasks)
        this.router.patch('/task/:taskId/sprint', [IsLoggedIn, canAssignSprintTasks], this.controller.setTaskSprint);

        // List sprints of a project (supports ?status=active,planned)
        this.router.get('/:goalId', [IsLoggedIn, canViewSprints], this.controller.listForGoal);
    }
}
