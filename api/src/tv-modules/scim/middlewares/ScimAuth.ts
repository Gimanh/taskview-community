import { createHash } from 'crypto'
import type { NextFunction, Request, Response } from 'express'
import { SsoRepository } from '../../sso/SsoRepository'
import { OrganizationRepository } from '../../organizations/OrganizationRepository'

const ssoRepo = new SsoRepository()
const orgRepo = new OrganizationRepository()

export const ScimAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
      detail: 'Missing or invalid authorization header',
      status: '401',
    })
  }

  const token = authHeader.slice(7)
  const hashedToken = createHash('sha256').update(token).digest('hex')

  const config = await ssoRepo.findByScimToken(hashedToken)
  if (!config) {
    return res.status(401).json({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
      detail: 'Invalid SCIM token',
      status: '401',
    })
  }

  const org = await orgRepo.findById(config.organizationId)
  if (!org) {
    return res.status(401).json({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
      detail: 'Organization not found',
      status: '401',
    })
  }

  res.locals.scimOrg = org
  res.locals.scimConfig = config

  next()
}
