import type { NextFunction, Request, Response } from 'express'
import { ORG_ADMIN_ROLES, type OrgRole } from '../types'

export const IsOrgAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const orgId = Number(req.params.orgId || req.body.organizationId)
  if (!orgId) return res.status(400).end()

  const member = await req.appUser.organizationManager.getCurrentUserMember(orgId)

  if (!member || !ORG_ADMIN_ROLES.includes(member.role as OrgRole)) return res.status(403).end()

  next()
}
