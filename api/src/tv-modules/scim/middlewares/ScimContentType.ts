import type { NextFunction, Request, Response } from 'express'

export const ScimContentType = (_req: Request, res: Response, next: NextFunction) => {
  res.type('application/scim+json')
  next()
}
