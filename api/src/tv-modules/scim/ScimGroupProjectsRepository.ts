import { and, asc, count, eq, gt, inArray, or, sql } from 'drizzle-orm'
import {
  CollaborationRolesSchema,
  CollaborationUsersSchema,
  CollaborationUsersToGoalsSchema,
  CollaborationUsersToRolesSchema,
  GoalsSchema,
  OrganizationMembersSchema,
  ScimGroupMembersSchema,
  ScimGroupProjectsSchema,
  ScimGroupsSchema,
  ScimUsersSchema,
  UsersSchema,
  type ScimGroupsSchemaTypeForSelect,
} from 'taskview-db-schemas'
import { Database } from '../../modules/db'
import { callWithCatch } from '../../utils/helpers'
import type {
  ScimAddToLinkedProjectsArgs,
  ScimAdminGroup,
  ScimAdminProject,
  ScimDeleteGroupProjectArgs,
  ScimFindActiveProjectArgs,
  ScimFindGroupForConfigArgs,
  ScimFindProjectRoleArgs,
  ScimProjectGrant,
  ScimSaveGroupProjectArgs,
} from './types'

export class ScimGroupProjectsRepository {
  private readonly db: Database

  constructor() {
    this.db = Database.getInstance()
  }

  async listGroups(ssoConfigId: number): Promise<ScimAdminGroup[]> {
    const groups = await callWithCatch(() =>
      this.db.dbDrizzle
        .select({ id: ScimGroupsSchema.id, displayName: ScimGroupsSchema.displayName, membersCount: count(ScimGroupMembersSchema.scimUserId) })
        .from(ScimGroupsSchema)
        .leftJoin(ScimGroupMembersSchema, eq(ScimGroupMembersSchema.groupId, ScimGroupsSchema.id))
        .where(eq(ScimGroupsSchema.ssoConfigId, ssoConfigId))
        .groupBy(ScimGroupsSchema.id)
        .orderBy(asc(sql`lower(${ScimGroupsSchema.displayName})`), asc(ScimGroupsSchema.id))
    )
    if (!groups?.length) return []

    const links = await callWithCatch(() =>
      this.db.dbDrizzle
        .select({
          groupId: ScimGroupProjectsSchema.groupId,
          goalId: ScimGroupProjectsSchema.goalId,
          goalName: GoalsSchema.name,
          roleId: ScimGroupProjectsSchema.roleId,
          roleName: CollaborationRolesSchema.name,
        })
        .from(ScimGroupProjectsSchema)
        .innerJoin(GoalsSchema, eq(GoalsSchema.id, ScimGroupProjectsSchema.goalId))
        .innerJoin(CollaborationRolesSchema, eq(CollaborationRolesSchema.id, ScimGroupProjectsSchema.roleId))
        .where(inArray(ScimGroupProjectsSchema.groupId, groups.map((group) => group.id)))
        .orderBy(asc(GoalsSchema.name))
    ) ?? []

    return groups.map((group) => ({
      ...group,
      projects: links
        .filter((link) => link.groupId === group.id)
        .map((link) => ({ goalId: link.goalId, goalName: link.goalName ?? '', roleId: link.roleId, roleName: link.roleName })),
    }))
  }

  async projectsWithRoles(organizationId: number): Promise<ScimAdminProject[]> {
    const rows = await callWithCatch(() =>
      this.db.dbDrizzle
        .select({ goalId: GoalsSchema.id, name: GoalsSchema.name, roleId: CollaborationRolesSchema.id, roleName: CollaborationRolesSchema.name })
        .from(GoalsSchema)
        .leftJoin(CollaborationRolesSchema, eq(CollaborationRolesSchema.goalId, GoalsSchema.id))
        .where(and(eq(GoalsSchema.organizationId, organizationId), eq(GoalsSchema.archive, 0)))
        .orderBy(asc(GoalsSchema.name), asc(CollaborationRolesSchema.id))
    ) ?? []

    const projects = new Map<number, ScimAdminProject>()
    for (const row of rows) {
      const project = projects.get(row.goalId) ?? { goalId: row.goalId, name: row.name ?? '', roles: [] }
      if (row.roleId !== null && row.roleName !== null) project.roles.push({ id: row.roleId, name: row.roleName })
      projects.set(row.goalId, project)
    }
    return [...projects.values()]
  }

  async findGroup(args: ScimFindGroupForConfigArgs): Promise<ScimGroupsSchemaTypeForSelect | null> {
    const rows = await callWithCatch(() =>
      this.db.dbDrizzle
        .select()
        .from(ScimGroupsSchema)
        .where(and(eq(ScimGroupsSchema.ssoConfigId, args.ssoConfigId), eq(ScimGroupsSchema.id, args.groupId)))
    )
    return rows?.[0] ?? null
  }

  async isActiveProject(args: ScimFindActiveProjectArgs): Promise<boolean> {
    const rows = await callWithCatch(() =>
      this.db.dbDrizzle
        .select({ id: GoalsSchema.id })
        .from(GoalsSchema)
        .where(and(eq(GoalsSchema.id, args.goalId), eq(GoalsSchema.organizationId, args.organizationId), eq(GoalsSchema.archive, 0)))
    )
    return !!rows?.length
  }

  async isProjectRole(args: ScimFindProjectRoleArgs): Promise<boolean> {
    const rows = await callWithCatch(() =>
      this.db.dbDrizzle
        .select({ id: CollaborationRolesSchema.id })
        .from(CollaborationRolesSchema)
        .innerJoin(GoalsSchema, eq(GoalsSchema.id, CollaborationRolesSchema.goalId))
        .where(and(
          eq(CollaborationRolesSchema.id, args.roleId),
          eq(CollaborationRolesSchema.goalId, args.goalId),
          eq(GoalsSchema.organizationId, args.organizationId),
        ))
    )
    return !!rows?.length
  }

  async save(args: ScimSaveGroupProjectArgs): Promise<boolean> {
    const rows = await callWithCatch(() =>
      this.db.dbDrizzle
        .insert(ScimGroupProjectsSchema)
        .values({ groupId: args.groupId, goalId: args.goalId, roleId: args.roleId })
        .onConflictDoUpdate({
          target: [ScimGroupProjectsSchema.groupId, ScimGroupProjectsSchema.goalId],
          set: { roleId: args.roleId },
        })
        .returning()
    )
    return !!rows?.length
  }

  async delete(args: ScimDeleteGroupProjectArgs): Promise<boolean> {
    const result = await callWithCatch(() =>
      this.db.dbDrizzle
        .delete(ScimGroupProjectsSchema)
        .where(and(eq(ScimGroupProjectsSchema.groupId, args.groupId), eq(ScimGroupProjectsSchema.goalId, args.goalId)))
    )
    return !!result?.rowCount
  }

  // What the links promise to active group members, skipping projects they own
  async grants(args: ScimAddToLinkedProjectsArgs): Promise<ScimProjectGrant[]> {
    const rows = await callWithCatch(() =>
      this.db.dbDrizzle
        .select({ email: ScimUsersSchema.memberEmail, goalId: ScimGroupProjectsSchema.goalId, roleId: ScimGroupProjectsSchema.roleId })
        .from(ScimGroupProjectsSchema)
        .innerJoin(ScimGroupMembersSchema, eq(ScimGroupMembersSchema.groupId, ScimGroupProjectsSchema.groupId))
        .innerJoin(ScimUsersSchema, and(eq(ScimUsersSchema.id, ScimGroupMembersSchema.scimUserId), eq(ScimUsersSchema.active, true)))
        .innerJoin(GoalsSchema, and(
          eq(GoalsSchema.id, ScimGroupProjectsSchema.goalId),
          eq(GoalsSchema.organizationId, args.orgId),
          eq(GoalsSchema.archive, 0),
        ))
        // Someone an admin removed from the organization keeps an active SCIM record, but gets no project
        .innerJoin(OrganizationMembersSchema, and(
          eq(OrganizationMembersSchema.organizationId, args.orgId),
          sql`lower(${OrganizationMembersSchema.email}) = lower(${ScimUsersSchema.memberEmail})`,
        ))
        .leftJoin(UsersSchema, eq(UsersSchema.id, GoalsSchema.owner))
        .where(and(
          sql`lower(${UsersSchema.email}) is distinct from lower(${ScimUsersSchema.memberEmail})`,
          ...(args.groupIds ? [inArray(ScimGroupProjectsSchema.groupId, args.groupIds)] : []),
          ...(args.goalIds ? [inArray(ScimGroupProjectsSchema.goalId, args.goalIds)] : []),
          ...(args.scimUserIds ? [inArray(ScimGroupMembersSchema.scimUserId, args.scimUserIds)] : []),
          ...(args.since ? [or(gt(ScimGroupProjectsSchema.createdAt, args.since), gt(ScimGroupMembersSchema.createdAt, args.since))] : []),
        ))
    )
    return rows ?? []
  }

  // Adds each person to the projects they are not in yet; a project they are in already is left as it is
  async addToProjects(grants: ScimProjectGrant[]): Promise<number | null> {
    if (!grants.length) return 0
    const byEmail = Map.groupBy(grants, (grant) => grant.email.toLowerCase())

    return await callWithCatch(() =>
      this.db.dbDrizzle.transaction(async (tx) => {
        let added = 0
        for (const [email, personGrants] of byEmail) {
          // Concurrent SCIM requests for the same person must not both insert: neither table has a unique key for this
          await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`scim-grant:${email}`}))`)
          const [existing] = await tx
            .select({ id: CollaborationUsersSchema.id })
            .from(CollaborationUsersSchema)
            .where(sql`lower(${CollaborationUsersSchema.email}) = ${email}`)
          const collabUserId = existing?.id
            ?? (await tx.insert(CollaborationUsersSchema).values({ email }).returning({ id: CollaborationUsersSchema.id }))[0].id

          const goalIds = [...new Set(personGrants.map((grant) => grant.goalId))]
          const linked = await tx
            .select({ goalId: CollaborationUsersToGoalsSchema.goalId })
            .from(CollaborationUsersToGoalsSchema)
            .where(and(eq(CollaborationUsersToGoalsSchema.userId, collabUserId), inArray(CollaborationUsersToGoalsSchema.goalId, goalIds)))
          const linkedGoalIds = new Set(linked.map((link) => link.goalId))
          const fresh = personGrants.filter((grant) => !linkedGoalIds.has(grant.goalId))
          if (!fresh.length) continue

          const freshGoalIds = [...new Set(fresh.map((grant) => grant.goalId))]
          await tx
            .insert(CollaborationUsersToGoalsSchema)
            .values(freshGoalIds.map((goalId) => ({ userId: collabUserId, goalId })))
            .onConflictDoNothing()
          // users_to_roles has no unique key, so links the person already holds are left out by hand
          const held = await tx
            .select({ roleId: CollaborationUsersToRolesSchema.roleId })
            .from(CollaborationUsersToRolesSchema)
            .where(eq(CollaborationUsersToRolesSchema.userId, collabUserId))
          const heldRoleIds = new Set(held.map((link) => link.roleId))
          const roleIds = [...new Set(fresh.map((grant) => grant.roleId))].filter((roleId) => !heldRoleIds.has(roleId))
          if (roleIds.length) {
            await tx.insert(CollaborationUsersToRolesSchema).values(roleIds.map((roleId) => ({ userId: collabUserId, roleId })))
          }
          added += freshGoalIds.length
        }
        return added
      })
    )
  }
}
