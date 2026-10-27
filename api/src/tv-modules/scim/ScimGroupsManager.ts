import type { ScimGroupsSchemaTypeForSelect } from 'taskview-db-schemas'
import { $logger } from '../../modules/logget'
import { ScimError } from './ScimError'
import { ScimGroupProjectsManager } from './ScimGroupProjectsManager'
import { ScimGroupsRepository } from './ScimGroupsRepository'
import { applyGroupPatchOperations } from './scim.groups.helpers'
import type {
  ScimApplyGroupChangesArgs,
  ScimCreateGroupArgs,
  ScimGetGroupArgs,
  ScimGroupAttributes,
  ScimGroupByIdArgs,
  ScimGroupView,
  ScimListGroupsArgs,
  ScimListGroupsResult,
  ScimPatchGroupArgs,
  ScimReplaceGroupArgs,
  ScimWithMembersArgs,
  ScimFindUsersByScimIdsArgs,
} from './types'

export class ScimGroupsManager {
  private readonly repository = new ScimGroupsRepository()
  private readonly projects = new ScimGroupProjectsManager()

  async listGroups(args: ScimListGroupsArgs): Promise<ScimListGroupsResult> {
    const { config, query } = args

    if (query.filter) {
      const found = await this.repository.findByFilter({ ssoConfigId: config.id, filter: query.filter })
      const groups = found.slice(query.startIndex - 1, query.startIndex - 1 + query.count)
      return { groups: await this.withMembers({ groups, excludeMembers: query.excludeMembers }), totalResults: found.length }
    }

    const [totalResults, groups] = await Promise.all([
      this.repository.countForConfig(config.id),
      this.repository.listPage({ ssoConfigId: config.id, offset: query.startIndex - 1, limit: query.count }),
    ])
    return { groups: await this.withMembers({ groups, excludeMembers: query.excludeMembers }), totalResults }
  }

  async getGroup(args: ScimGetGroupArgs): Promise<ScimGroupView> {
    const group = await this.findGroup(args)
    const [view] = await this.withMembers({ groups: [group], excludeMembers: args.excludeMembers })
    return view
  }

  async createGroup(args: ScimCreateGroupArgs): Promise<ScimGroupView> {
    const { config, attributes } = args

    const conflict = await this.repository.findConflict({ ssoConfigId: config.id, externalId: attributes.externalId })
    if (conflict) throw new ScimError({ status: 409, scimType: 'uniqueness', detail: 'A group with this externalId already exists' })
    const scimUserIds = await this.resolveMembers({ ssoConfigId: config.id, scimIds: attributes.members })

    const group = await this.repository.insert({
      values: {
        ssoConfigId: config.id,
        scimId: crypto.randomUUID(),
        displayName: attributes.displayName,
        externalId: attributes.externalId,
      },
      scimUserIds,
    })
    if (!group) throw new ScimError({ status: 500, detail: 'Failed to create group' })
    $logger.info(`SCIM: provisioned group ${group.scimId} for SSO config ${config.id}`)

    const [view] = await this.withMembers({ groups: [group], excludeMembers: false })
    return view
  }

  async replaceGroup(args: ScimReplaceGroupArgs): Promise<ScimGroupView> {
    const group = await this.findGroup(args)
    return await this.applyChanges({ org: args.org, config: args.config, group, next: args.attributes })
  }

  async patchGroup(args: ScimPatchGroupArgs): Promise<ScimGroupView> {
    const group = await this.findGroup(args)
    const [view] = await this.withMembers({ groups: [group], excludeMembers: false })
    const current: ScimGroupAttributes = {
      displayName: group.displayName,
      externalId: group.externalId,
      members: (view.members ?? []).map((member) => member.scimId),
    }
    const next = applyGroupPatchOperations({ current, operations: args.operations })
    return await this.applyChanges({ org: args.org, config: args.config, group, next })
  }

  async deleteGroup(args: ScimGroupByIdArgs): Promise<void> {
    const group = await this.findGroup(args)
    await this.repository.deleteById(group.id)
    $logger.info(`SCIM: deleted group ${group.scimId} of SSO config ${args.config.id}`)
  }

  private async applyChanges(args: ScimApplyGroupChangesArgs): Promise<ScimGroupView> {
    const { config, group, next } = args

    const conflict = await this.repository.findConflict({ ssoConfigId: config.id, externalId: next.externalId, excludeId: group.id })
    if (conflict) throw new ScimError({ status: 409, scimType: 'uniqueness', detail: 'Another group already has this externalId' })
    const scimUserIds = await this.resolveMembers({ ssoConfigId: config.id, scimIds: next.members })
    const before = new Set(await this.repository.memberIds(group.id))

    const updated = await this.repository.update({ id: group.id, values: next, scimUserIds })
    if (!updated) throw new ScimError({ status: 500, detail: 'Failed to update group' })

    // Only the people who just joined: someone taken out of a linked project by hand stays out
    const joined = scimUserIds.filter((id) => !before.has(id))
    await this.projects.addToLinkedProjects({ orgId: args.org.id, groupIds: [group.id], scimUserIds: joined })

    const [view] = await this.withMembers({ groups: [updated], excludeMembers: false })
    return view
  }

  private async findGroup(args: ScimGroupByIdArgs): Promise<ScimGroupsSchemaTypeForSelect> {
    const group = await this.repository.findByScimId({ ssoConfigId: args.config.id, scimId: args.scimId })
    if (!group) throw new ScimError({ status: 404, detail: 'Group not found' })
    return group
  }

  private async resolveMembers(args: ScimFindUsersByScimIdsArgs): Promise<number[]> {
    const users = await this.repository.findUsersByScimIds(args)
    const known = new Set(users.map((user) => user.scimId))
    const unknown = args.scimIds.filter((id) => !known.has(id))
    if (unknown.length) {
      throw new ScimError({ status: 400, scimType: 'invalidValue', detail: `Unknown member: ${unknown[0]}` })
    }
    return users.map((user) => user.id)
  }

  private async withMembers(args: ScimWithMembersArgs): Promise<ScimGroupView[]> {
    const { groups, excludeMembers } = args
    if (excludeMembers) return groups.map((group) => ({ group, members: null }))
    const members = await this.repository.membersOf(groups.map((group) => group.id))
    return groups.map((group) => ({ group, members: members.filter((member) => member.groupId === group.id) }))
  }
}
