import { Router } from 'express'
import type { Routable } from '../../types/routable.type'
import { IsLoggedIn } from '../auth/middlewares/is-logged-in'
import { RejectApiTokenAuth } from '../api-tokens/middlewares/RejectApiTokenAuth'
import { ImportController } from './ImportController'
import { CanImportIntoOrganization, CanManageImportJob } from './middlewares/ImportPermission'

export default class ImportRoutes implements Routable {
    private readonly router: ReturnType<typeof Router>
    private readonly controller: ImportController

    constructor() {
        this.router = Router()
        this.controller = new ImportController()
        this.initRoutes()
    }

    getRouter() {
        return this.router
    }

    initRoutes() {
        const job = [IsLoggedIn, RejectApiTokenAuth, CanManageImportJob]
        this.router.get('/providers', [IsLoggedIn, RejectApiTokenAuth], this.controller.providers)
        this.router.get('/jobs', [IsLoggedIn, RejectApiTokenAuth, CanImportIntoOrganization], this.controller.fetchJobs)
        this.router.post('/jobs', [IsLoggedIn, RejectApiTokenAuth, CanImportIntoOrganization], this.controller.createJob)
        this.router.get('/jobs/:id', job, this.controller.fetchJob)
        this.router.get('/jobs/:id/projects', job, this.controller.remoteProjects)
        this.router.get('/jobs/:id/projects/:externalId', job, this.controller.projectMeta)
        this.router.post('/jobs/:id/start', job, this.controller.start)
        this.router.post('/jobs/:id/cancel', job, this.controller.cancel)
    }
}
