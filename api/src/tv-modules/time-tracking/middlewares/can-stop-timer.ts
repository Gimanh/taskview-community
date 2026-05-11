import type { NextFunction, Request, Response } from 'express'
import { $logger } from '../../../modules/logget'
import { GoalPermissions } from '../../../types/auth.types'
import { logError } from '../../../utils/api'

export const canStopTimer = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.appUser.getUserData()!.id

    const repo = req.appUser.timeTrackingManager.repository
    const entryIdRaw = req.body?.entryId
    const target = entryIdRaw
        ? await repo.findById(Number(entryIdRaw)).catch(logError)
        : await repo.findActiveForUser(userId).catch(logError)

    if (!target || target.endedAt) return res.status(404).end()

    const checker = await req.appUser.permissionsFetcher
        .getCheckerForGoal(target.goalId)
        .catch(logError)

    if (!checker) {
        $logger.error('Can not get permissions for canStopTimer middleware')
        return res.status(500).end()
    }

    const isOwn = target.userId === userId
    if (isOwn && checker.hasPermissions(GoalPermissions.TIMETRACKING_CAN_LOG)) return next()
    if (checker.hasPermissions(GoalPermissions.TIMETRACKING_CAN_MANAGE_ALL)) return next()

    return res.status(403).end()
}
