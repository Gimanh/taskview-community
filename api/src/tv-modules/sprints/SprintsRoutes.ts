import { Router } from 'express';
import type { Routable } from '../../types/routable.type';
import { GoalPermissions } from '../../types/auth.types';
import { IsLoggedIn } from '../auth/middlewares/is-logged-in';
import SprintsController from './SprintsController';
import { canAssignSprintTasks } from './middlewares/can-assign-sprint-tasks';
import { requireSprintPermission } from './middlewares/require-sprint-permission';
import { goalIdFromBody, goalIdFromParam, goalIdFromSprint } from './middlewares/goal-id-resolvers';

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
        // Create — goal comes from the request body (the creation target).
        this.router.post('', [IsLoggedIn, requireSprintPermission(GoalPermissions.SPRINT_CAN_MANAGE, goalIdFromBody)], this.controller.create);

        // Analytics
        this.router.get('/sprint/:sprintId/burndown', [IsLoggedIn, requireSprintPermission(GoalPermissions.SPRINT_CAN_VIEW_ANALYTICS, goalIdFromSprint)], this.controller.burndown);
        this.router.get('/goal/:goalId/velocity', [IsLoggedIn, requireSprintPermission(GoalPermissions.SPRINT_CAN_VIEW_ANALYTICS, goalIdFromParam)], this.controller.velocity);

        // Cadence: per-project auto-generation config (Linear-style) — goal from the URL param.
        this.router.get('/goal/:goalId/cadence', [IsLoggedIn, requireSprintPermission(GoalPermissions.SPRINT_CAN_VIEW, goalIdFromParam)], this.controller.getCadence);
        this.router.put('/goal/:goalId/cadence', [IsLoggedIn, requireSprintPermission(GoalPermissions.SPRINT_CAN_MANAGE, goalIdFromParam)], this.controller.setCadence);

        // Cursor-paginated planning task lists (?scope=backlog|sprint&cursor=&limit=)
        this.router.get('/sprint/:sprintId/planning', [IsLoggedIn, requireSprintPermission(GoalPermissions.SPRINT_CAN_VIEW, goalIdFromSprint)], this.controller.planning);

        // Single sprint detail + lifecycle — goal is always derived from the sprint.
        this.router.get('/sprint/:sprintId', [IsLoggedIn, requireSprintPermission(GoalPermissions.SPRINT_CAN_VIEW, goalIdFromSprint)], this.controller.getOne);
        this.router.patch('/sprint/:sprintId', [IsLoggedIn, requireSprintPermission(GoalPermissions.SPRINT_CAN_MANAGE, goalIdFromSprint)], this.controller.update);
        this.router.post('/sprint/:sprintId/activate', [IsLoggedIn, requireSprintPermission(GoalPermissions.SPRINT_CAN_MANAGE, goalIdFromSprint)], this.controller.activate);
        this.router.post('/sprint/:sprintId/review', [IsLoggedIn, requireSprintPermission(GoalPermissions.SPRINT_CAN_MANAGE, goalIdFromSprint)], this.controller.review);
        this.router.post('/sprint/:sprintId/close', [IsLoggedIn, requireSprintPermission(GoalPermissions.SPRINT_CAN_MANAGE, goalIdFromSprint)], this.controller.close);
        this.router.post('/sprint/:sprintId/pause', [IsLoggedIn, requireSprintPermission(GoalPermissions.SPRINT_CAN_MANAGE, goalIdFromSprint)], this.controller.pause);
        this.router.post('/sprint/:sprintId/resume', [IsLoggedIn, requireSprintPermission(GoalPermissions.SPRINT_CAN_MANAGE, goalIdFromSprint)], this.controller.resume);
        this.router.delete('/sprint/:sprintId', [IsLoggedIn, requireSprintPermission(GoalPermissions.SPRINT_CAN_MANAGE, goalIdFromSprint)], this.controller.remove);
        this.router.put('/sprint/:sprintId/retro', [IsLoggedIn, requireSprintPermission(GoalPermissions.SPRINT_CAN_MANAGE, goalIdFromSprint)], this.controller.saveRetro);

        // Assign a task to / out of a sprint — authorized against the task's goal.
        this.router.patch('/task/:taskId/sprint', [IsLoggedIn, canAssignSprintTasks], this.controller.setTaskSprint);

        // List sprints of a project (supports ?status=active,planned) — goal from the URL param.
        this.router.get('/:goalId', [IsLoggedIn, requireSprintPermission(GoalPermissions.SPRINT_CAN_VIEW, goalIdFromParam)], this.controller.listForGoal);
    }
}
