import type { NextFunction, Request, Response } from 'express'

export const IsOrgMemberIfProvided = async (req: Request, res: Response, next: NextFunction) => {
  const organizationId = Number(
    req.query.organizationId || req.body.organizationId || req.params.organizationId
  )

  if (!organizationId) return next()

  const member = await req.appUser.organizationManager.getCurrentUserMember(organizationId)

  if (!member) return res.status(403).end()

  next()
}
