import { Router } from 'express';
import type { Routable } from '../../types/routable.type';
import { IsLoggedIn } from '../auth/middlewares/is-logged-in';
import { GraphController } from './GraphControler';
export default class GraphRoutes implements Routable {
    private readonly router: ReturnType<typeof Router>;
    private readonly graphController: GraphController;

    constructor() {
        this.router = Router();
        this.graphController = new GraphController();
        this.initRoutes();
    }

    getRouter() {
        return this.router;
    }

    initRoutes() {
        this.router.post('', [IsLoggedIn], this.graphController.addEdge);
        this.router.get('/:goalId', [IsLoggedIn], this.graphController.fetchAllEdges);
        this.router.delete('/:id', [IsLoggedIn], this.graphController.deleteEdge);
    }
}
