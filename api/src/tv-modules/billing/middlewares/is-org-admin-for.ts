import type { NextFunction, Request, Response } from 'express'
import { ORG_ADMIN_ROLES, type OrgRole } from '../../organizations/types'
import { parsePositiveInt } from '../../../utils/helpers'

export type OrganizationIdResolver = (id: number) => Promise<number | null>

export const isOrgAdminFor = (resolveOrganizationId: OrganizationIdResolver) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const id = parsePositiveInt(req.params.id)
    if (id === null) return res.status(400).end()

    const organizationId = await resolveOrganizationId(id)
    if (organizationId === null) return res.status(404).end()

    const member = await req.appUser.organizationManager.getCurrentUserMember(organizationId)
    if (!member || !ORG_ADMIN_ROLES.includes(member.role as OrgRole)) return res.status(403).end()

    return next()
  }
}
