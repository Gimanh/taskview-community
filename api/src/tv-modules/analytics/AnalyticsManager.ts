import type {
  AnalyticsAvailableGoal,
  AnalyticsDrillDownResponse,
  AnalyticsScope,
  AnalyticsSection,
  AnalyticsSectionCatalogEntry,
  AnalyticsSectionsResponse,
} from 'taskview-api'
import type { AppUser } from '../../core/AppUser'
import { $logger } from '../../modules/logget'
import { GoalPermissions } from '../../types/auth.types'
import { AnalyticsRepository } from './AnalyticsRepository'
import { formatDateInZone } from './helpers'
import { SectionRegistry } from './sections/SectionRegistry'
import type {
  AnalyticsArgBuildSections,
  AnalyticsArgDrillDown,
  BuilderContext,
  SectionBuilder,
} from './types'

export class AnalyticsManager {
  public readonly repository: AnalyticsRepository
  private readonly registry: SectionRegistry
  private readonly user: AppUser

  constructor(user: AppUser) {
    this.user = user
    this.repository = new AnalyticsRepository()
    this.registry = new SectionRegistry()
  }

  getCatalog(): AnalyticsSectionCatalogEntry[] {
    return this.registry.catalog()
  }

  async getAccessibleGoalIds(organizationId: number): Promise<number[]> {
    return this.fetchGoalIds(organizationId, [GoalPermissions.ANALYTICS_CAN_VIEW])
  }

  async getDrillDownGoalIds(organizationId: number): Promise<number[]> {
    return this.fetchGoalIds(organizationId, [
      GoalPermissions.ANALYTICS_CAN_VIEW,
      GoalPermissions.TASKS_CAN_WATCH_DETAILS,
    ])
  }

  async buildSections(params: AnalyticsArgBuildSections): Promise<AnalyticsSectionsResponse> {
    const { scope, organizationId, period, range, timezone, sectionIds } = params

    const allAccessible = await this.getAccessibleGoalIds(organizationId)
    const accessibleGoalIds = this.narrowToScope(allAccessible, scope)

    const ctx: BuilderContext = {
      appUser: this.user,
      scope,
      period,
      range,
      accessibleGoalIds,
      repository: this.repository,
    }

    const builders = this.registry.filterByIds(sectionIds)
    const eligible = builders.filter(b => this.isBuilderEligible(b, scope))

    const settled = await Promise.allSettled(eligible.map(b => b.build(ctx)))

    const sections: AnalyticsSection[] = []
    const failedSectionIds: string[] = []
    settled.forEach((r, i) => {
      if (r.status === 'fulfilled' && r.value) {
        sections.push(r.value)
      } else if (r.status === 'rejected') {
        const sectionId = eligible[i].id
        failedSectionIds.push(sectionId)
        $logger.error({
          err: r.reason,
          sectionId,
          userId: this.user.getUserData()?.id,
          organizationId,
        }, 'Analytics section failed')
      }
    })

    const availableGoals = await this.fetchAvailableGoals(allAccessible)

    return {
      scope,
      period,
      range: { from: formatDateInZone(range.from, timezone), to: formatDateInZone(range.to, timezone) },
      sections,
      availableGoals,
      failedSectionIds,
    }
  }

  async drillDown(params: AnalyticsArgDrillDown): Promise<AnalyticsDrillDownResponse> {
    const { sectionId, scope, organizationId, period, range, arg } = params

    const builder = this.registry.get(sectionId)
    if (!builder || !builder.drillDown) {
      return { sectionId, tasks: [], total: 0 }
    }

    const aggregateGoalIds = this.narrowToScope(
      await this.getAccessibleGoalIds(organizationId),
      scope,
    )
    const accessibleGoalIds = this.narrowToScope(
      await this.getDrillDownGoalIds(organizationId),
      scope,
    )

    if (aggregateGoalIds.length > 0 && accessibleGoalIds.length === 0) {
      return { sectionId, tasks: [], total: 0, denied: true }
    }

    const ctx: BuilderContext = {
      appUser: this.user,
      scope,
      period,
      range,
      accessibleGoalIds,
      repository: this.repository,
    }

    const tasks = await builder.drillDown(ctx, arg).catch((err) => {
      $logger.error(`Analytics drill-down ${sectionId} failed: ${err}`)
      return []
    })

    return { sectionId, tasks, total: tasks.length }
  }

  private async fetchGoalIds(organizationId: number, permissions: string[]): Promise<number[]> {
    const userData = this.user.getUserData()
    if (!userData?.id || !userData?.email) return []

    const ids = await this.user.organizationManager.isCurrentUserOrgOwner(organizationId)
      ? await this.repository.fetchAllGoalIdsInOrg(organizationId)
      : await this.repository.fetchGoalIdsWithPermissions(
        userData.id,
        userData.email,
        organizationId,
        permissions,
      )

    return this.applyTokenFilter(ids)
  }

  private applyTokenFilter(ids: number[]): number[] {
    const tokenAllowed = this.user.getAllowedGoalIds()
    if (tokenAllowed && tokenAllowed.length > 0) {
      return ids.filter(id => tokenAllowed.includes(id))
    }
    return ids
  }

  private narrowToScope(allAccessible: number[], scope: AnalyticsScope): number[] {
    if (scope.kind === 'project') {
      return allAccessible.includes(scope.goalId) ? [scope.goalId] : []
    }
    return allAccessible
  }

  private isBuilderEligible(builder: SectionBuilder, scope: AnalyticsScope): boolean {
    if (builder.requiresGoalScope && scope.kind !== 'project') return false
    return true
  }

  private async fetchAvailableGoals(goalIds: number[]): Promise<AnalyticsAvailableGoal[]> {
    if (goalIds.length === 0) return []
    return await this.repository.getGoalsForIds(goalIds)
  }
}
