import { Router } from 'express';
import type { Routable } from '../../types/routable.type';
import { GoalPermissions } from '../../types/auth.types';
import { IsLoggedIn } from '../auth/middlewares/is-logged-in';
import AutomationsController from './AutomationsController';
import { goalIdFromParam, goalIdFromRule } from './middlewares/goal-id-resolvers';
import { requireAutomationPermission } from './middlewares/require-automation-permission';

export default class AutomationsRoutes implements Routable {
    private readonly router: ReturnType<typeof Router>;
    private readonly controller: AutomationsController;

    constructor() {
        this.router = Router();
        this.controller = new AutomationsController();
        this.initRoutes();
    }

    getRouter() {
        return this.router;
    }

    initRoutes() {
        const canView = requireAutomationPermission({ permission: GoalPermissions.AUTOMATION_CAN_VIEW, resolveGoalId: goalIdFromParam });
        const canManage = requireAutomationPermission({ permission: GoalPermissions.AUTOMATION_CAN_MANAGE, resolveGoalId: goalIdFromParam });
        const canManageRule = requireAutomationPermission({ permission: GoalPermissions.AUTOMATION_CAN_MANAGE, resolveGoalId: goalIdFromRule });

        this.router.get('/catalog', [IsLoggedIn], this.controller.catalog);
        this.router.get('/goal/:goalId/options/:source', [IsLoggedIn, canView], this.controller.options);
        this.router.get('/goal/:goalId/rules', [IsLoggedIn, canView], this.controller.list);
        this.router.post('/goal/:goalId/rules', [IsLoggedIn, canManage], this.controller.create);
        this.router.patch('/rule/:ruleId', [IsLoggedIn, canManageRule], this.controller.update);
        this.router.delete('/rule/:ruleId', [IsLoggedIn, canManageRule], this.controller.remove);
    }
}
