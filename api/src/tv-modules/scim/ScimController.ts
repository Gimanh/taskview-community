import { ArkErrors } from 'arktype'
import type { Request, Response } from 'express'
import { $logger } from '../../modules/logget'
import { PublicApiUrl } from '../../modules/public-url'
import { ScimError } from './ScimError'
import { ScimGroupsManager } from './ScimGroupsManager'
import { ScimManager } from './ScimManager'
import { scimGroupResourceType, scimGroupSchema, scimServiceProviderConfig, scimUserResourceType, scimUserSchema } from './scim.discovery'
import { SCIM_GROUP_SCHEMA, excludesMembers, groupAttributesFromBody, parseGroupListQuery, toScimGroup } from './scim.groups.helpers'
import { SCIM_USER_SCHEMA, attributesFromBody, parseListQuery, toScimError, toScimList, toScimUser } from './scim.helpers'
import { ScimGroupArkType, ScimPatchArkType, ScimUserArkType, type ScimContext, type ScimHandler, type ScimValidateArgs } from './types'

export class ScimController {
  private readonly manager = new ScimManager()
  private readonly groups = new ScimGroupsManager()

  listUsers = this.handle(async (req, res) => {
    const query = parseListQuery(req.query as Record<string, unknown>)
    const { users, totalResults } = await this.manager.listUsers({ ...this.contextOf(res), query })
    const baseUrl = this.baseUrl(req)
    return res.json(toScimList({
      resources: users.map((user) => toScimUser({ user, baseUrl })),
      totalResults,
      startIndex: query.startIndex,
    }))
  })

  getUser = this.handle(async (req, res) => {
    const user = await this.manager.getUser({ ...this.contextOf(res), scimId: req.params.id })
    return res.json(toScimUser({ user, baseUrl: this.baseUrl(req) }))
  })

  createUser = this.handle(async (req, res) => {
    const attributes = attributesFromBody(this.validate({ schema: ScimUserArkType, body: req.body }))
    const user = await this.manager.createUser({ ...this.contextOf(res), attributes })
    const resource = toScimUser({ user, baseUrl: this.baseUrl(req) })
    return res.status(201).location(resource.meta.location).json(resource)
  })

  replaceUser = this.handle(async (req, res) => {
    const attributes = attributesFromBody(this.validate({ schema: ScimUserArkType, body: req.body }))
    const user = await this.manager.replaceUser({ ...this.contextOf(res), scimId: req.params.id, attributes })
    return res.json(toScimUser({ user, baseUrl: this.baseUrl(req) }))
  })

  patchUser = this.handle(async (req, res) => {
    const { Operations } = this.validate({ schema: ScimPatchArkType, body: req.body })
    const user = await this.manager.patchUser({ ...this.contextOf(res), scimId: req.params.id, operations: Operations })
    return res.json(toScimUser({ user, baseUrl: this.baseUrl(req) }))
  })

  deleteUser = this.handle(async (req, res) => {
    await this.manager.deleteUser({ ...this.contextOf(res), scimId: req.params.id })
    return res.status(204).end()
  })

  listGroups = this.handle(async (req, res) => {
    const query = parseGroupListQuery(req.query as Record<string, unknown>)
    const { groups, totalResults } = await this.groups.listGroups({ ...this.contextOf(res), query })
    const baseUrl = this.baseUrl(req)
    return res.json(toScimList({
      resources: groups.map((view) => toScimGroup({ view, baseUrl })),
      totalResults,
      startIndex: query.startIndex,
    }))
  })

  getGroup = this.handle(async (req, res) => {
    const excludeMembers = excludesMembers(req.query as Record<string, unknown>)
    const view = await this.groups.getGroup({ ...this.contextOf(res), scimId: req.params.id, excludeMembers })
    return res.json(toScimGroup({ view, baseUrl: this.baseUrl(req) }))
  })

  createGroup = this.handle(async (req, res) => {
    const attributes = groupAttributesFromBody(this.validate({ schema: ScimGroupArkType, body: req.body }))
    const view = await this.groups.createGroup({ ...this.contextOf(res), attributes })
    const resource = toScimGroup({ view, baseUrl: this.baseUrl(req) })
    return res.status(201).location(resource.meta.location).json(resource)
  })

  replaceGroup = this.handle(async (req, res) => {
    const attributes = groupAttributesFromBody(this.validate({ schema: ScimGroupArkType, body: req.body }))
    const view = await this.groups.replaceGroup({ ...this.contextOf(res), scimId: req.params.id, attributes })
    return res.json(toScimGroup({ view, baseUrl: this.baseUrl(req) }))
  })

  // Microsoft Entra ID expects 204 here and advises against returning the whole member list
  patchGroup = this.handle(async (req, res) => {
    const { Operations } = this.validate({ schema: ScimPatchArkType, body: req.body })
    await this.groups.patchGroup({ ...this.contextOf(res), scimId: req.params.id, operations: Operations })
    return res.status(204).end()
  })

  deleteGroup = this.handle(async (req, res) => {
    await this.groups.deleteGroup({ ...this.contextOf(res), scimId: req.params.id })
    return res.status(204).end()
  })

  serviceProviderConfig = this.handle(async (req, res) => {
    return res.json(scimServiceProviderConfig(this.baseUrl(req)))
  })

  resourceTypes = this.handle(async (req, res) => {
    const resources = [scimUserResourceType(this.baseUrl(req)), scimGroupResourceType(this.baseUrl(req))]
    return res.json(toScimList({ resources, totalResults: resources.length, startIndex: 1 }))
  })

  resourceType = this.handle(async (req, res) => {
    if (req.params.id === 'User') return res.json(scimUserResourceType(this.baseUrl(req)))
    if (req.params.id === 'Group') return res.json(scimGroupResourceType(this.baseUrl(req)))
    throw new ScimError({ status: 404, detail: 'Resource type not found' })
  })

  schemas = this.handle(async (req, res) => {
    const resources = [scimUserSchema(this.baseUrl(req)), scimGroupSchema(this.baseUrl(req))]
    return res.json(toScimList({ resources, totalResults: resources.length, startIndex: 1 }))
  })

  schema = this.handle(async (req, res) => {
    if (req.params.id === SCIM_USER_SCHEMA) return res.json(scimUserSchema(this.baseUrl(req)))
    if (req.params.id === SCIM_GROUP_SCHEMA) return res.json(scimGroupSchema(this.baseUrl(req)))
    throw new ScimError({ status: 404, detail: 'Schema not found' })
  })

  notFound = this.handle(async () => {
    throw new ScimError({ status: 404, detail: 'Endpoint not found' })
  })

  private handle(handler: ScimHandler) {
    return async (req: Request, res: Response) => {
      try {
        await handler(req, res)
      } catch (error) {
        if (error instanceof ScimError) {
          return res.status(error.status).json(toScimError({ status: error.status, detail: error.message, scimType: error.scimType }))
        }
        $logger.error(error, 'SCIM: unexpected error')
        return res.status(500).json(toScimError({ status: 500, detail: 'Internal server error' }))
      }
    }
  }

  private validate<T>(args: ScimValidateArgs<T>): T {
    const result = args.schema(args.body ?? {})
    if (result instanceof ArkErrors) {
      throw new ScimError({ status: 400, scimType: 'invalidSyntax', detail: result.summary })
    }
    return result
  }

  private contextOf(res: Response): ScimContext {
    return { org: res.locals.scimOrg, config: res.locals.scimConfig }
  }

  private baseUrl(req: Request): string {
    return `${PublicApiUrl.base(req)}/scim/v2`
  }
}
