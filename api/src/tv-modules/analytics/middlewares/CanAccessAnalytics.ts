import type { NextFunction, Request, Response } from 'express'
import { GoalPermissionsFetcher } from '../../../core/GoalPermissionsFetcher'
import { $logger } from '../../../modules/logget'
import { GoalPermissions } from '../../../types/auth.types'
import { logError } from '../../../utils/api'
import { parsePositiveInt } from '../../../utils/helpers'

export const CanAccessAnalytics = async (req: Request, res: Response, next: NextFunction) => {
  const orgId = parsePositiveInt(req.query?.organizationId)
  if (orgId === null) return res.status(400).end()

  const member = await req.appUser.organizationManager.getCurrentUserMember(orgId)
  if (!member) return res.status(403).end()

  if (await req.appUser.organizationManager.isCurrentUserOrgAdmin(orgId)) return next()

  const scope = req.query?.scope

  if (scope === 'project') {
    const goalId = parsePositiveInt(req.query?.goalId)
    if (goalId === null) return res.status(400).end()

    const checker = await req.appUser.permissionsFetcher
      .getPermissionsForType(goalId, GoalPermissionsFetcher.PERMISSION_TYPE_FOR_GOAL)
      .catch(logError)
    if (!checker) {
      $logger.error('Can not get permissions for CanAccessAnalytics middleware')
      return res.status(500).end()
    }
    if (!checker.hasPermissions(GoalPermissions.ANALYTICS_CAN_VIEW)) return res.status(403).end()

    return next()
  }

  const accessibleGoalIds = await req.appUser.analyticsManager
    .getAccessibleGoalIds(orgId)
    .catch(logError)
  if (!accessibleGoalIds || accessibleGoalIds.length === 0) return res.status(403).end()

  return next()
}
