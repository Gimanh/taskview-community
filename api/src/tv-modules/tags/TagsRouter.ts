import { Router } from 'express';
import type { Routable } from '../../types/routable.type';
import { IsLoggedIn } from '../auth/middlewares/is-logged-in';
import { CanAddTag } from './middlewares/CanAddTag';
import { CanDeleteTag } from './middlewares/CanDeleteTag';
import { CanToggleTag } from './middlewares/CanToggleTag';
import { CanUpdateTag } from './middlewares/CanUpdateTag';
import { TagsController } from './TagsController';

export default class TagsRouter implements Routable {
    private readonly router: ReturnType<typeof Router>;
    private readonly controller: TagsController;

    constructor() {
        this.router = Router();
        this.controller = new TagsController();
        this.initRoutes();
    }

    getRouter() {
        return this.router;
    }

    initRoutes() {
        /**
         * Add new tag
         */
        this.router.post('', [IsLoggedIn, CanAddTag], this.controller.addTagNew);

        /**
         * Delete tag
         */
        this.router.delete('', [IsLoggedIn, CanDeleteTag], this.controller.deleteTagNew);

        /**
         * Update tag
         */
        this.router.patch('', [IsLoggedIn, CanUpdateTag], this.controller.updateTagNew);

        /**
         * Fetch tags for goal
         */
        this.router.get('', [IsLoggedIn], this.controller.fetchAllTagsForUser);

        /**
         * Toggle tag for task
         */
        this.router.patch('/toggle', [IsLoggedIn, CanToggleTag], this.controller.toggleTagNew);
    }
}
