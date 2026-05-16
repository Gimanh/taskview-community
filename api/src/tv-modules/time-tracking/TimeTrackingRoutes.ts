import { Router } from 'express'
import type { Routable } from '../../types/routable.type'
import { IsLoggedIn } from '../auth/middlewares/is-logged-in'
import { TimeTrackingController } from './TimeTrackingController'
import { canLogTimeOnTask } from './middlewares/can-log-time-on-task'
import { canStopTimer } from './middlewares/can-stop-timer'
import { canAccessTimeEntry } from './middlewares/can-access-time-entry'
import { canFetchTimeEntries } from './middlewares/can-fetch-time-entries'
import { canViewActiveTimer } from './middlewares/can-view-active-timer'
import { canViewTimeStats } from './middlewares/can-view-time-stats'
import { isOrgMemberForReports } from './middlewares/is-org-member-for-reports'

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
        this.router.get('/active', [IsLoggedIn, canViewActiveTimer], this.controller.active)

        this.router.post('/entries', [IsLoggedIn, canLogTimeOnTask], this.controller.createManual)
        this.router.patch('/entries/:id', [IsLoggedIn, canAccessTimeEntry('edit')], this.controller.update)
        this.router.delete('/entries/:id', [IsLoggedIn, canAccessTimeEntry('edit')], this.controller.delete)
        this.router.get('/entries', [IsLoggedIn, canFetchTimeEntries], this.controller.fetchEntries)
        this.router.get('/entries/:id/history', [IsLoggedIn, canAccessTimeEntry('view')], this.controller.fetchHistory)

        this.router.get('/summary/task/:taskId', [IsLoggedIn, canViewTimeStats({ kind: 'task', param: 'taskId' })], this.controller.summaryByTask)
        this.router.get('/summary/goal/:goalId', [IsLoggedIn, canViewTimeStats({ kind: 'goal', param: 'goalId' })], this.controller.summaryByGoal)

        this.router.get('/reports/summary', [IsLoggedIn, isOrgMemberForReports], this.controller.reportSummary)
        this.router.get('/reports/by-day', [IsLoggedIn, isOrgMemberForReports], this.controller.reportByDay)
        this.router.get('/reports/by-user', [IsLoggedIn, isOrgMemberForReports], this.controller.reportByUser)
        this.router.get('/reports/by-task', [IsLoggedIn, isOrgMemberForReports], this.controller.reportByTask)
        this.router.get('/reports/contributors', [IsLoggedIn, isOrgMemberForReports], this.controller.reportContributors)
    }
}
