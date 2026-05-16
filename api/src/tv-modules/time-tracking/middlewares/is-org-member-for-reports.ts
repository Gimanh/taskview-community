import type { NextFunction, Request, Response } from 'express'
import { GoalPermissions } from '../../../types/auth.types'
import { parsePositiveInt } from '../../../utils/helpers'

const TT_PERMS: string[] = [
    GoalPermissions.TIMETRACKING_CAN_VIEW,
    GoalPermissions.TIMETRACKING_CAN_LOG,
    GoalPermissions.TIMETRACKING_CAN_MANAGE_ALL,
]

export const isOrgMemberForReports = async (req: Request, res: Response, next: NextFunction) => {
    const orgId = parsePositiveInt(req.query?.organizationId)
    if (orgId === null) return res.status(400).end()

    const tokenPerms = req.appUser.getTokenPermissions()
    if (tokenPerms && tokenPerms.length > 0 && !TT_PERMS.some((p) => tokenPerms.includes(p))) {
        return res.status(403).end()
    }

    const member = await req.appUser.organizationManager.getCurrentUserMember(orgId)
    if (!member) return res.status(403).end()

    return next()
}
