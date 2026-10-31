import type { NextFunction, Request, Response } from 'express'
import { ORG_ADMIN_ROLES, type OrgRole } from '../../organizations/types'
import { ImportRepository } from '../ImportRepository'
import type { ImportOrgAdminCheckArgs } from '../types'

const repository = new ImportRepository()

async function isOrgAdmin(args: ImportOrgAdminCheckArgs): Promise<boolean> {
  if (args.req.appUser.isBlocked()) return false
  const member = await args.req.appUser.organizationManager.getCurrentUserMember(args.organizationId)
  return !!member && ORG_ADMIN_ROLES.includes(member.role as OrgRole)
}

export const CanImportIntoOrganization = async (req: Request, res: Response, next: NextFunction) => {
  const organizationId = Number(req.method === 'GET' ? req.query?.organizationId : req.body?.organizationId)
  if (!Number.isInteger(organizationId) || organizationId <= 0) return res.status(400).end()
  if (!(await isOrgAdmin({ req, organizationId }))) return res.status(403).end()
  return next()
}

export const CanManageImportJob = async (req: Request, res: Response, next: NextFunction) => {
  const jobId = Number(req.params.id)
  if (!Number.isInteger(jobId) || jobId <= 0) return res.status(400).end()

  const job = await repository.fetchJob(jobId)
  const userId = req.appUser.getUserData()?.id
  if (!job || !userId || job.createdBy !== userId) return res.status(404).end()
  if (!(await isOrgAdmin({ req, organizationId: job.organizationId }))) return res.status(403).end()

  return next()
}
