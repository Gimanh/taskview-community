import type { NextFunction, Request, Response } from 'express'
import { ORG_ADMIN_ROLES, type OrgRole } from '../../organizations/types'

export const canAddGoal = async (req: Request, res: Response, next: NextFunction) => {
    if (req.appUser.isBlocked()) {
        return res.status(403).end()
    }

    const organizationId = req.body.organizationId
    if (organizationId) {
        const member = await req.appUser.organizationManager.getCurrentUserMember(Number(organizationId))
        if (!member || !ORG_ADMIN_ROLES.includes(member.role as OrgRole)) {
            return res.status(403).end()
        }
    }

    return next()
}
