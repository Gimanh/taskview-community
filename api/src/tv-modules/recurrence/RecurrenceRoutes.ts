import { Router } from 'express';
import { GoalPermissions } from '../../types/auth.types';
import type { Routable } from '../../types/routable.type';
import { IsLoggedIn } from '../auth/middlewares/is-logged-in';
import RecurrenceController from './RecurrenceController';
import {
    goalIdFromRuleParam,
    goalIdFromTaskBody,
    goalIdFromTaskParam,
    requireRecurrencePermission,
} from './middlewares/require-recurrence-permission';

export default class RecurrenceRoutes implements Routable {
    private readonly router: ReturnType<typeof Router>;
    private readonly controller: RecurrenceController;

    constructor() {
        this.router = Router();
        this.controller = new RecurrenceController();
        this.initRoutes();
    }

    getRouter() {
        return this.router;
    }

    initRoutes() {
        // Recurrence is a schedule attribute of a task, so editing reuses the existing deadline permission.
        this.router.post('', [IsLoggedIn, requireRecurrencePermission(GoalPermissions.TASKS_CAN_EDIT_DEADLINE, goalIdFromTaskBody)], this.controller.create);

        // Read access mirrors reading the task itself.
        this.router.get('/task/:taskId', [IsLoggedIn, requireRecurrencePermission(GoalPermissions.COMPONENT_CAN_WATCH_CONTENT, goalIdFromTaskParam)], this.controller.getForTask);
        this.router.get('/:ruleId', [IsLoggedIn, requireRecurrencePermission(GoalPermissions.COMPONENT_CAN_WATCH_CONTENT, goalIdFromRuleParam)], this.controller.getOne);

        this.router.patch('/:ruleId', [IsLoggedIn, requireRecurrencePermission(GoalPermissions.TASKS_CAN_EDIT_DEADLINE, goalIdFromRuleParam)], this.controller.update);
        this.router.post('/:ruleId/pause', [IsLoggedIn, requireRecurrencePermission(GoalPermissions.TASKS_CAN_EDIT_DEADLINE, goalIdFromRuleParam)], this.controller.pause);
        this.router.post('/:ruleId/resume', [IsLoggedIn, requireRecurrencePermission(GoalPermissions.TASKS_CAN_EDIT_DEADLINE, goalIdFromRuleParam)], this.controller.resume);
        this.router.post('/:ruleId/skip', [IsLoggedIn, requireRecurrencePermission(GoalPermissions.TASKS_CAN_EDIT_DEADLINE, goalIdFromRuleParam)], this.controller.skip);
        this.router.delete('/:ruleId', [IsLoggedIn, requireRecurrencePermission(GoalPermissions.TASKS_CAN_EDIT_DEADLINE, goalIdFromRuleParam)], this.controller.remove);
    }
}
