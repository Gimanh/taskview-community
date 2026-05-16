import type { NextFunction, Request, Response } from 'express'
import { GoalPermissionsFetcher } from '../../../core/GoalPermissionsFetcher'
import { $logger } from '../../../modules/logget'
import { GoalPermissions } from '../../../types/auth.types'
import { logError } from '../../../utils/api'

export const canLogTimeOnTask = async (req: Request, res: Response, next: NextFunction) => {
    const taskId = Number(req.body?.taskId)
    if (!taskId) return res.status(400).end()

    const checker = await req.appUser.permissionsFetcher
        .getPermissionsForType(taskId, GoalPermissionsFetcher.PERMISSION_TYPE_FOR_TASK)
        .catch(logError)

    if (!checker) {
        $logger.error('Can not get permissions for canLogTimeOnTask middleware')
        return res.status(500).end()
    }

    if (
        checker.hasPermissions(GoalPermissions.TIMETRACKING_CAN_LOG) ||
        checker.hasPermissions(GoalPermissions.TIMETRACKING_CAN_MANAGE_ALL)
    ) {
        return next()
    }

    return res.status(403).end()
}
