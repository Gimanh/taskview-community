import { Router } from 'express';
import type { Routable } from '../../types/routable.type';
import { GoalPermissions } from '../../types/auth.types';
import { IsLoggedIn } from '../auth/middlewares/is-logged-in';
import { KanbanController } from './KanbanController';
import { goalIdFromBody, goalIdFromParam, goalIdFromStatusBody } from './middlewares/goal-id-resolvers';
import { requireKanbanPermission } from './middlewares/require-kanban-permission';

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
        this.router.post(
            '/fetch-statuses',
            [
                IsLoggedIn,
                requireKanbanPermission({
                    anyOf: [GoalPermissions.KANBAN_CAN_VIEW],
                    resolveGoalId: goalIdFromBody,
                }),
            ],
            this.kanbanController.fetchAllColumns
        );

        this.router.post(
            '/add-status',
            [
                IsLoggedIn, requireKanbanPermission({
                    anyOf: [GoalPermissions.KANBAN_CAN_MANAGE],
                    resolveGoalId: goalIdFromBody
                })
            ],
            this.kanbanController.addStatus
        );

        this.router.post(
            '/delete-status',
            [
                IsLoggedIn, requireKanbanPermission({
                    anyOf: [GoalPermissions.KANBAN_CAN_MANAGE],
                    resolveGoalId: goalIdFromStatusBody
                })
            ],
            this.kanbanController.deleteStatus
        );

        this.router.post(
            '/update-status',
            [
                IsLoggedIn, requireKanbanPermission({
                    anyOf: [GoalPermissions.KANBAN_CAN_MANAGE],
                    resolveGoalId: goalIdFromStatusBody
                })
            ],
            this.kanbanController.updateStatus
        );

        this.router.get(
            '/tasks/:goalId/:columnId/:cursor',
            [
                IsLoggedIn,
                requireKanbanPermission({
                    anyOf: [GoalPermissions.KANBAN_CAN_VIEW],
                    resolveGoalId: goalIdFromParam,
                }),
                requireKanbanPermission({
                    anyOf: [GoalPermissions.COMPONENT_CAN_WATCH_CONTENT],
                    resolveGoalId: goalIdFromParam,
                }),
            ],
            this.kanbanController.fetchTasksForColumn
        );

        //we do not use this route in the client (no logic for this route on the client side)!!!
        this.router.get(
            '/tasks-order/:goalId/:columnId/:cursor',
            [
                IsLoggedIn, requireKanbanPermission({
                    anyOf: [GoalPermissions.KANBAN_CAN_VIEW],
                    resolveGoalId: goalIdFromParam
                })
            ],
            this.kanbanController.getTasksOrderForColumnAndCursor
        );

        this.router.patch(
            '/update-tasks-order-and-column',
            [
                IsLoggedIn,
                requireKanbanPermission({
                    anyOf: [GoalPermissions.KANBAN_CAN_MANAGE],
                    resolveGoalId: goalIdFromBody
                })
            ],
            this.kanbanController.updateTasksOrderAndColumn
        );
    }
}
