import type { NextFunction, Request, Response } from 'express'
import { $logger } from '../../../modules/logget'
import { GoalPermissions } from '../../../types/auth.types'
import { logError } from '../../../utils/api'

type Action = 'view' | 'edit'

export const canAccessTimeEntry = (action: Action) => async (req: Request, res: Response, next: NextFunction) => {
    const entryId = Number(req.params.id)
    if (!entryId) return res.status(400).end()

    const userId = req.appUser.getUserData()!.id

    const entry = await req.appUser.timeTrackingManager.repository.findById(entryId).catch(logError)
    if (!entry) return res.status(404).end()

    const checker = await req.appUser.permissionsFetcher
        .getCheckerForGoal(entry.goalId)
        .catch(logError)

    if (!checker) {
        $logger.error('Can not get permissions for canAccessTimeEntry middleware')
        return res.status(500).end()
    }

    if (action === 'view') {
        if (
            checker.hasPermissions(GoalPermissions.TIMETRACKING_CAN_VIEW) ||
            checker.hasPermissions(GoalPermissions.TIMETRACKING_CAN_MANAGE_ALL)
        ) {
            return next()
        }
        return res.status(403).end()
    }

    const isOwn = entry.userId === userId
    if (isOwn && checker.hasPermissions(GoalPermissions.TIMETRACKING_CAN_LOG)) return next()
    if (checker.hasPermissions(GoalPermissions.TIMETRACKING_CAN_MANAGE_ALL)) return next()

    return res.status(403).end()
}
