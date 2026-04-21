import type { NextFunction, Request, Response } from 'express'
import { ORG_ADMIN_ROLES, type OrgRole } from '../../organizations/types'
import { SsoRepository } from '../SsoRepository'

const ssoRepo = new SsoRepository()

/**
 * Resolves SSO config by :configId param, finds its organization,
 * and checks that the current user is admin/owner of that organization.
 */
export const IsSsoConfigAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const configId = Number(req.params.configId)
  if (!configId) return res.status(400).end()

  const config = await ssoRepo.findById(configId)
  if (!config) return res.status(404).end()

  const member = await req.appUser.organizationManager.getCurrentUserMember(config.organizationId)
  if (!member || !ORG_ADMIN_ROLES.includes(member.role as OrgRole)) {
    return res.status(403).end()
  }

  next()
}
