import { type } from 'arktype'
import type { Request, Response } from 'express'
import { logError } from '../../utils/api'
import {
  OrganizationArkTypeCreate,
  OrganizationArkTypeUpdate,
  OrganizationMemberArkTypeAdd,
  OrganizationMemberArkTypeUpdateRole,
  OrganizationMemberArkTypeRemove,
} from './types'

export class OrganizationController {
  create = async (req: Request, res: Response) => {
    const out = OrganizationArkTypeCreate(req.body)
    if (out instanceof type.errors) {
      return res.status(400).send(out.summary)
    }

    const org = await req.appUser.organizationManager.create(out).catch(logError)
    return res.tvJson(org ?? null)
  }

  update = async (req: Request, res: Response) => {
    const orgId = Number(req.params.orgId)
    if (!orgId) return res.status(400).end()

    const out = OrganizationArkTypeUpdate(req.body)
    if (out instanceof type.errors) {
      return res.status(400).send(out.summary)
    }

    const org = await req.appUser.organizationManager.update({ ...out, organizationId: orgId }).catch(logError)
    return res.tvJson(org ?? null)
  }

  delete = async (req: Request, res: Response) => {
    const orgId = Number(req.params.orgId)
    if (!orgId) return res.status(400).end()

    const result = await req.appUser.organizationManager.delete(orgId).catch(logError)
    return res.tvJson(!!result)
  }

  fetch = async (req: Request, res: Response) => {
    const orgs = await req.appUser.organizationManager.fetchForCurrentUser().catch(logError)
    return res.tvJson(orgs ?? [])
  }

  getById = async (req: Request, res: Response) => {
    const orgId = Number(req.params.orgId)
    if (!orgId) return res.status(400).end()

    const org = await req.appUser.organizationManager.getById(orgId).catch(logError)
    return res.tvJson(org ?? null)
  }

  fetchMembers = async (req: Request, res: Response) => {
    const orgId = Number(req.params.orgId)
    if (!orgId) return res.status(400).end()

    const members = await req.appUser.organizationManager.fetchMembers(orgId).catch(logError)
    return res.tvJson(members ?? [])
  }

  addMember = async (req: Request, res: Response) => {
    const out = OrganizationMemberArkTypeAdd(req.body)
    if (out instanceof type.errors) {
      return res.status(400).send(out.summary)
    }

    const member = await req.appUser.organizationManager
      .addMember(out.organizationId, out.email, out.role)
      .catch(logError)
    return res.tvJson(member ?? null)
  }

  updateMemberRole = async (req: Request, res: Response) => {
    const out = OrganizationMemberArkTypeUpdateRole(req.body)
    if (out instanceof type.errors) {
      return res.status(400).send(out.summary)
    }

    const member = await req.appUser.organizationManager
      .updateMemberRole(out.organizationId, out.email, out.role)
      .catch(logError)
    return res.tvJson(member ?? null)
  }

  removeMember = async (req: Request, res: Response) => {
    const out = OrganizationMemberArkTypeRemove(req.body)
    if (out instanceof type.errors) {
      return res.status(400).send(out.summary)
    }

    const result = await req.appUser.organizationManager
      .removeMember(out.organizationId, out.email)
      .catch(logError)
    return res.tvJson(!!result)
  }
}
