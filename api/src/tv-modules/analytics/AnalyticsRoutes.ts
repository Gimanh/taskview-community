import { Router } from 'express'
import type { Routable } from '../../types/routable.type'
import { RejectApiTokenAuth } from '../api-tokens/middlewares/RejectApiTokenAuth'
import { IsLoggedIn } from '../auth/middlewares/is-logged-in'
import { AnalyticsController } from './AnalyticsController'
import { CanAccessAnalytics } from './middlewares/CanAccessAnalytics'

export default class AnalyticsRoutes implements Routable {
  private readonly router: ReturnType<typeof Router>
  private readonly controller: AnalyticsController

  constructor() {
    this.router = Router()
    this.controller = new AnalyticsController()
    this.initRoutes()
  }

  getRouter() {
    return this.router
  }

  initRoutes() {
    const guards = [IsLoggedIn, RejectApiTokenAuth, CanAccessAnalytics]
    this.router.get('/sections', guards, this.controller.fetchSections)
    this.router.get('/drilldown/:sectionId', guards, this.controller.fetchDrillDown)
    this.router.get('/drill-down/:sectionId', guards, this.controller.fetchDrillDown)
  }
}
