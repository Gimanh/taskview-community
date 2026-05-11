import type { NextFunction, Request, Response } from 'express'
import { GoalPermissionsFetcher } from '../../../core/GoalPermissionsFetcher'
import { $logger } from '../../../modules/logget'
import { GoalPermissions } from '../../../types/auth.types'
import { logError } from '../../../utils/api'

type Source = { kind: 'goal'; param: string } | { kind: 'task'; param: string }

export const canViewTimeStats = (source: Source) => async (req: Request, res: Response, next: NextFunction) => {
    const idRaw = req.params[source.param] ?? req.query[source.param]
    const id = Number(idRaw)
    if (!id) return res.status(400).end()

    const checker =
        source.kind === 'task'
            ? await req.appUser.permissionsFetcher
                .getPermissionsForType(id, GoalPermissionsFetcher.PERMISSION_TYPE_FOR_TASK)
                .catch(logError)
            : await req.appUser.permissionsFetcher.getCheckerForGoal(id).catch(logError)

    if (!checker) {
        $logger.error('Can not get permissions for canViewTimeStats middleware')
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
