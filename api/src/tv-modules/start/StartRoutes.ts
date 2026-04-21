import { Router } from 'express'
import type { Routable } from '../../types/routable.type'
import { IsLoggedIn } from '../auth/middlewares/is-logged-in'
import { IsOrgMemberIfProvided } from '../../middlewares/is-org-member'
import { StartController } from './StartController'

export default class StartRoutes implements Routable {
    private readonly router: ReturnType<typeof Router>
    private readonly controller: StartController

    constructor() {
        this.router = Router()
        this.controller = new StartController()
        this.initRoutes()
    }

    getRouter() {
        return this.router
    }

    initRoutes() {
        this.router.get('/fetch/lists', [IsLoggedIn, IsOrgMemberIfProvided], this.controller.fetchAllLists)
        this.router.get('/fetchallstate', [IsLoggedIn, IsOrgMemberIfProvided], this.controller.fetchAllState)
        this.router.get('/search-task', [IsLoggedIn, IsOrgMemberIfProvided], this.controller.searchTaskInAllProjects)
    }
}
