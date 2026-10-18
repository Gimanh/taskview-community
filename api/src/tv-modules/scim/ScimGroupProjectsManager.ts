import { $logger } from '../../modules/logget'
import { ScimGroupProjectsRepository } from './ScimGroupProjectsRepository'
import type {
  ScimAddToLinkedProjectsArgs,
  ScimGroupLinksOverview,
  ScimGroupLinksOverviewArgs,
  ScimGroupProjectRef,
  ScimLinkGroupProjectArgs,
  ScimLinkGroupProjectResult,
  ScimUnlinkGroupProjectResult,
} from './types'

export class ScimGroupProjectsManager {
  private readonly repository = new ScimGroupProjectsRepository()

  async overview(args: ScimGroupLinksOverviewArgs): Promise<ScimGroupLinksOverview> {
    const [groups, projects] = await Promise.all([
      this.repository.listGroups(args.config.id),
      this.repository.projectsWithRoles(args.config.organizationId),
    ])
    return { groups, projects }
  }

  async link(args: ScimLinkGroupProjectArgs): Promise<ScimLinkGroupProjectResult> {
    const { config, groupId, goalId, roleId } = args
    const group = await this.repository.findGroup({ ssoConfigId: config.id, groupId })
    if (!group) return 'group_not_found'
    // Whoever configures SSO can already decide who signs in, so any active project of the organization can be linked
    if (!(await this.repository.isActiveProject({ organizationId: config.organizationId, goalId }))) return 'project_not_found'
    if (!(await this.repository.isProjectRole({ organizationId: config.organizationId, goalId, roleId }))) return 'role_not_in_project'

    const saved = await this.repository.save({ groupId, goalId, roleId })
    if (!saved) throw new Error('Failed to link a SCIM group to a project')
    $logger.info(`SCIM: linked group ${group.scimId} to project ${goalId} in SSO config ${config.id}`)

    await this.addToLinkedProjects({ orgId: config.organizationId, groupIds: [groupId], goalIds: [goalId] })
    return 'ok'
  }

  async unlink(args: ScimGroupProjectRef): Promise<ScimUnlinkGroupProjectResult> {
    const group = await this.repository.findGroup({ ssoConfigId: args.config.id, groupId: args.groupId })
    if (!group) return 'not_found'
    return await this.repository.delete({ groupId: args.groupId, goalId: args.goalId }) ? 'ok' : 'not_found'
  }

  async addToLinkedProjects(args: ScimAddToLinkedProjectsArgs): Promise<void> {
    if (args.scimUserIds?.length === 0) return
    const grants = await this.repository.grants(args)
    const added = await this.repository.addToProjects(grants)
    if (added === null) {
      $logger.error(`SCIM: failed to add group members to linked projects in org ${args.orgId}`)
      return
    }
    if (added) $logger.info(`SCIM: added group members to ${added} linked project(s) in org ${args.orgId}`)
  }
}
