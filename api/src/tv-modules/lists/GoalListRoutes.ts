import { Router } from 'express';
import type { Routable } from '../../types/routable.type';
import { IsLoggedIn } from '../auth/middlewares/is-logged-in';
import GoalListController from './GoalListController';
import { canAddLists } from './middlewares/can-add-lists';
// import { canArchiveLists } from './middlewares/can-archive-lists';
import { canDeleteLists } from './middlewares/can-delete-lists';
import { canFetchLists } from './middlewares/can-fetch-lists';
import { canUpdateLists } from './middlewares/can-update-lists';

export default class GoalListRoutes implements Routable {
    private readonly router: ReturnType<typeof Router>;
    private readonly goalListController: GoalListController;

    constructor() {
        this.router = Router();
        this.goalListController = new GoalListController();
        this.initRoutes();
    }

    getRouter() {
        return this.router;
    }

    initRoutes() {
        /**
         * Add new list to goal
         */
        this.router.post('', [IsLoggedIn, canAddLists], this.goalListController.addListNew);
        /**
         * Update list
         */
        this.router.patch('', [IsLoggedIn, canUpdateLists], this.goalListController.updateListNew);

        /**
         * Delete list
         */
        this.router.delete('', [IsLoggedIn, canDeleteLists], this.goalListController.deleteListNew);

        /**
         * Fetch lists for goal
         */
        this.router.get('/:goalId', [IsLoggedIn, canFetchLists], this.goalListController.fetchListsNew);
    }
}
