import type { NextFunction, Request, Response } from 'express'
import { GoalPermissionsFetcher } from '../../../core/GoalPermissionsFetcher'
import { $logger } from '../../../modules/logget'
import { GoalPermissions } from '../../../types/auth.types'
import { logError } from '../../../utils/api'

const TT_PERMS: string[] = [
    GoalPermissions.TIMETRACKING_CAN_VIEW,
    GoalPermissions.TIMETRACKING_CAN_LOG,
    GoalPermissions.TIMETRACKING_CAN_MANAGE_ALL,
]

export const canFetchTimeEntries = async (req: Request, res: Response, next: NextFunction) => {
    const goalIdRaw = req.query.goalId
    const taskIdRaw = req.query.taskId

    const tokenPerms = req.appUser.getTokenPermissions()
    if (tokenPerms && tokenPerms.length > 0 && !TT_PERMS.some((p) => tokenPerms.includes(p))) {
        return res.status(403).end()
    }

    if (!goalIdRaw && !taskIdRaw) return next()

    const checker = goalIdRaw
        ? await req.appUser.permissionsFetcher.getCheckerForGoal(Number(goalIdRaw)).catch(logError)
        : await req.appUser.permissionsFetcher
            .getPermissionsForType(Number(taskIdRaw), GoalPermissionsFetcher.PERMISSION_TYPE_FOR_TASK)
            .catch(logError)

    if (!checker) {
        $logger.error('Can not get permissions for canFetchTimeEntries middleware')
        return res.status(500).end()
    }

    if (
        checker.hasPermissions(GoalPermissions.TIMETRACKING_CAN_VIEW) ||
        checker.hasPermissions(GoalPermissions.TIMETRACKING_CAN_MANAGE_ALL)
    ) {
        return next()
    }

    return res.status(403).end()
}
