import type { NextFunction, Request, Response } from 'express'
import { toScimError } from '../scim.helpers'

export const ScimBodyErrorHandler = (err: { type?: string; status?: number }, _req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) return next(err)

  if (err.type === 'entity.parse.failed') {
    return res.status(400).type('application/scim+json').json(toScimError({ status: 400, scimType: 'invalidSyntax', detail: 'Malformed JSON body' }))
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).type('application/scim+json').json(toScimError({ status: 413, detail: 'Request body is too large' }))
  }
  return next(err)
}
