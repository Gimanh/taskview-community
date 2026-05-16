import type { NextFunction, Request, Response } from 'express'
import { GoalPermissions } from '../../../types/auth.types'
import { logError } from '../../../utils/api'

const TT_PERMS: string[] = [
    GoalPermissions.TIMETRACKING_CAN_VIEW,
    GoalPermissions.TIMETRACKING_CAN_LOG,
    GoalPermissions.TIMETRACKING_CAN_MANAGE_ALL,
]

export const canViewActiveTimer = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.appUser.getUserData()?.id
    if (!userId) return res.status(401).end()

    const tokenPerms = req.appUser.getTokenPermissions()
    if (tokenPerms && tokenPerms.length > 0 && !TT_PERMS.some((p) => tokenPerms.includes(p))) {
        return res.status(403).end()
    }

    const allowedGoalIds = req.appUser.getAllowedGoalIds()
    if (allowedGoalIds && allowedGoalIds.length > 0) {
        const active = await req.appUser.timeTrackingManager.repository
            .findActiveForUser(userId)
            .catch(logError)
        if (active && !allowedGoalIds.includes(active.goalId)) return res.status(403).end()
    }

    return next()
}
