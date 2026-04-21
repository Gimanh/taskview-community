import type { NextFunction, Request, Response } from 'express'
import { OrgRoles } from '../types'

export const IsOrgOwner = async (req: Request, res: Response, next: NextFunction) => {
  const orgId = Number(req.params.orgId || req.body.organizationId)
  if (!orgId) return res.status(400).end()

  const member = await req.appUser.organizationManager.getCurrentUserMember(orgId)

  if (!member || member.role !== OrgRoles.OWNER) return res.status(403).end()

  next()
}
