import { Router } from 'express'
import type { Routable } from '../../types/routable.type'
import { IsLoggedIn } from '../auth/middlewares/is-logged-in'
import { TimeTrackingController } from './TimeTrackingController'
import { canLogTimeOnTask } from './middlewares/can-log-time-on-task'
import { canStopTimer } from './middlewares/can-stop-timer'
import { canAccessTimeEntry } from './middlewares/can-access-time-entry'
import { canFetchTimeEntries } from './middlewares/can-fetch-time-entries'
import { canViewTimeStats } from './middlewares/can-view-time-stats'

export default class TimeTrackingRoutes implements Routable {
    private readonly router: ReturnType<typeof Router>
    private readonly controller: TimeTrackingController

    constructor() {
        this.router = Router()
        this.controller = new TimeTrackingController()
        this.initRoutes()
    }

    getRouter() {
        return this.router
    }

    private initRoutes() {
        this.router.post('/start', [IsLoggedIn, canLogTimeOnTask], this.controller.start)
        this.router.post('/stop', [IsLoggedIn, canStopTimer], this.controller.stop)
        this.router.get('/active', [IsLoggedIn], this.controller.active)

        this.router.post('/entries', [IsLoggedIn, canLogTimeOnTask], this.controller.createManual)
        this.router.patch('/entries/:id', [IsLoggedIn, canAccessTimeEntry('edit')], this.controller.update)
        this.router.delete('/entries/:id', [IsLoggedIn, canAccessTimeEntry('edit')], this.controller.delete)
        this.router.get('/entries', [IsLoggedIn, canFetchTimeEntries], this.controller.fetchEntries)
        this.router.get('/entries/:id/history', [IsLoggedIn, canAccessTimeEntry('view')], this.controller.fetchHistory)

        this.router.get('/summary/task/:taskId', [IsLoggedIn, canViewTimeStats({ kind: 'task', param: 'taskId' })], this.controller.summaryByTask)
        this.router.get('/summary/goal/:goalId', [IsLoggedIn, canViewTimeStats({ kind: 'goal', param: 'goalId' })], this.controller.summaryByGoal)
    }
}
