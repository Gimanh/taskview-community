import { and, asc, count, eq, inArray, ne, or, sql } from 'drizzle-orm'
import {
  CollaborationRolesSchema,
  CollaborationUsersSchema,
  CollaborationUsersToGoalsSchema,
  CollaborationUsersToRolesSchema,
  GoalsSchema,
  OrganizationMembersSchema,
  ScimUsersSchema,
  type ScimSuspendedMembership,
  type ScimUsersSchemaTypeForInsert,
  type ScimUsersSchemaTypeForSelect,
} from 'taskview-db-schemas'
import { Database } from '../../modules/db'
import { callWithCatch } from '../../utils/helpers'
import type {
  ScimFindByFilterArgs,
  ScimFindByScimIdArgs,
  ScimFindConflictArgs,
  ScimFindForSignInArgs,
  ScimListPageArgs,
  ScimMembershipArgs,
  ScimMoveMembershipArgs,
  ScimRestoreMembershipArgs,
  ScimUpdateUserArgs,
} from './types'

export class ScimRepository {
  private readonly db: Database

  constructor() {
    this.db = Database.getInstance()
  }

  async findByScimId(args: ScimFindByScimIdArgs): Promise<ScimUsersSchemaTypeForSelect | null> {
    const rows = await callWithCatch(() =>
      this.db.dbDrizzle
        .select()
        .from(ScimUsersSchema)
        .where(and(eq(ScimUsersSchema.ssoConfigId, args.ssoConfigId), eq(ScimUsersSchema.scimId, args.scimId)))
    )
    return rows?.[0] ?? null
  }

  async findForSignIn(args: ScimFindForSignInArgs): Promise<ScimUsersSchemaTypeForSelect | null> {
    const rows = await callWithCatch(() =>
      this.db.dbDrizzle
        .select()
        .from(ScimUsersSchema)
        .where(and(
          eq(ScimUsersSchema.ssoConfigId, args.ssoConfigId),
          or(inArray(ScimUsersSchema.email, args.emails), inArray(ScimUsersSchema.memberEmail, args.emails)),
        ))
        .orderBy(asc(ScimUsersSchema.id))
    )
    return rows?.[0] ?? null
  }

  async findByFilter(args: ScimFindByFilterArgs): Promise<ScimUsersSchemaTypeForSelect | null> {
    const { attribute, value } = args.filter
    const condition = attribute === 'userName'
      ? sql`lower(${ScimUsersSchema.userName}) = lower(${value})`
      : attribute === 'externalId'
        ? eq(ScimUsersSchema.externalId, value)
        : eq(ScimUsersSchema.email, value)

    const rows = await callWithCatch(() =>
      this.db.dbDrizzle
        .select()
        .from(ScimUsersSchema)
        .where(and(eq(ScimUsersSchema.ssoConfigId, args.ssoConfigId), condition))
    )
    return rows?.[0] ?? null
  }

  async findConflict(args: ScimFindConflictArgs): Promise<ScimUsersSchemaTypeForSelect | null> {
    const { userName, email, externalId } = args.attributes
    const sameIdentity = or(
      sql`lower(${ScimUsersSchema.userName}) = lower(${userName})`,
      eq(ScimUsersSchema.email, email),
      ...(externalId ? [eq(ScimUsersSchema.externalId, externalId)] : []),
    )

    const rows = await callWithCatch(() =>
      this.db.dbDrizzle
        .select()
        .from(ScimUsersSchema)
        .where(and(
          eq(ScimUsersSchema.ssoConfigId, args.ssoConfigId),
          sameIdentity,
          ...(args.excludeId ? [ne(ScimUsersSchema.id, args.excludeId)] : []),
        ))
        .limit(1)
    )
    return rows?.[0] ?? null
  }

  async listPage(args: ScimListPageArgs): Promise<ScimUsersSchemaTypeForSelect[]> {
    const rows = await callWithCatch(() =>
      this.db.dbDrizzle
        .select()
        .from(ScimUsersSchema)
        .where(eq(ScimUsersSchema.ssoConfigId, args.ssoConfigId))
        .orderBy(asc(ScimUsersSchema.id))
        .offset(args.offset)
        .limit(args.limit)
    )
    return rows ?? []
  }

  async countForConfig(ssoConfigId: number): Promise<number> {
    const rows = await callWithCatch(() =>
      this.db.dbDrizzle
        .select({ total: count() })
        .from(ScimUsersSchema)
        .where(eq(ScimUsersSchema.ssoConfigId, ssoConfigId))
    )
    return rows?.[0]?.total ?? 0
  }

  async insert(values: ScimUsersSchemaTypeForInsert): Promise<ScimUsersSchemaTypeForSelect | null> {
    const rows = await callWithCatch(() =>
      this.db.dbDrizzle.insert(ScimUsersSchema).values(values).returning()
    )
    return rows?.[0] ?? null
  }

  async update(args: ScimUpdateUserArgs): Promise<ScimUsersSchemaTypeForSelect | null> {
    const { values } = args
    const rows = await callWithCatch(() =>
      this.db.dbDrizzle
        .update(ScimUsersSchema)
        .set({
          userName: values.userName,
          email: values.email,
          memberEmail: values.memberEmail,
          externalId: values.externalId,
          displayName: values.displayName,
          givenName: values.givenName,
          familyName: values.familyName,
          active: values.active,
          suspendedMembership: values.suspendedMembership,
          updatedAt: new Date(),
        })
        .where(eq(ScimUsersSchema.id, args.id))
        .returning()
    )
    return rows?.[0] ?? null
  }

  async deleteById(id: number): Promise<boolean> {
    const result = await callWithCatch(() =>
      this.db.dbDrizzle.delete(ScimUsersSchema).where(eq(ScimUsersSchema.id, id))
    )
    return !!result?.rowCount
  }

  async snapshotMembership(args: ScimMembershipArgs): Promise<ScimSuspendedMembership | null> {
    return await callWithCatch(async () => {
      const [member] = await this.db.dbDrizzle
        .select({ role: OrganizationMembersSchema.role })
        .from(OrganizationMembersSchema)
        .where(and(eq(OrganizationMembersSchema.organizationId, args.orgId), eq(OrganizationMembersSchema.email, args.email)))
      if (!member) return null

      const goals = await this.db.dbDrizzle
        .select({ goalId: CollaborationUsersToGoalsSchema.goalId, collabUserId: CollaborationUsersSchema.id })
        .from(CollaborationUsersToGoalsSchema)
        .innerJoin(CollaborationUsersSchema, eq(CollaborationUsersSchema.id, CollaborationUsersToGoalsSchema.userId))
        .innerJoin(GoalsSchema, eq(GoalsSchema.id, CollaborationUsersToGoalsSchema.goalId))
        .where(and(eq(GoalsSchema.organizationId, args.orgId), sql`lower(${CollaborationUsersSchema.email}) = ${args.email}`))

      const goalIds = goals.map((g) => g.goalId)
      const roles = goalIds.length
        ? await this.db.dbDrizzle
          .select({ goalId: CollaborationRolesSchema.goalId, roleId: CollaborationRolesSchema.id })
          .from(CollaborationUsersToRolesSchema)
          .innerJoin(CollaborationRolesSchema, eq(CollaborationRolesSchema.id, CollaborationUsersToRolesSchema.roleId))
          .where(and(
            inArray(CollaborationUsersToRolesSchema.userId, goals.map((g) => g.collabUserId)),
            inArray(CollaborationRolesSchema.goalId, goalIds),
          ))
        : []

      return {
        role: member.role,
        goals: goalIds.map((goalId) => ({
          goalId,
          roleIds: roles.filter((r) => r.goalId === goalId).map((r) => r.roleId),
        })),
      }
    })
  }

  async restoreGoals(args: ScimRestoreMembershipArgs): Promise<boolean> {
    if (!args.goals.length) return true

    const result = await callWithCatch(() =>
      this.db.dbDrizzle.transaction(async (tx) => {
        const goals = await tx
          .select({ id: GoalsSchema.id })
          .from(GoalsSchema)
          .where(and(inArray(GoalsSchema.id, args.goals.map((g) => g.goalId)), eq(GoalsSchema.organizationId, args.orgId)))
        const liveGoalIds = new Set(goals.map((g) => g.id))
        if (!liveGoalIds.size) return true

        const [existing] = await tx
          .select({ id: CollaborationUsersSchema.id })
          .from(CollaborationUsersSchema)
          .where(sql`lower(${CollaborationUsersSchema.email}) = ${args.email}`)
        const collabUserId = existing?.id
          ?? (await tx.insert(CollaborationUsersSchema).values({ email: args.email }).returning({ id: CollaborationUsersSchema.id }))[0].id

        await tx
          .insert(CollaborationUsersToGoalsSchema)
          .values([...liveGoalIds].map((goalId) => ({ userId: collabUserId, goalId })))
          .onConflictDoNothing()

        const wantedRoleIds = args.goals.filter((g) => liveGoalIds.has(g.goalId)).flatMap((g) => g.roleIds)
        if (!wantedRoleIds.length) return true

        const liveRoles = await tx
          .select({ id: CollaborationRolesSchema.id })
          .from(CollaborationRolesSchema)
          .where(and(inArray(CollaborationRolesSchema.id, wantedRoleIds), inArray(CollaborationRolesSchema.goalId, [...liveGoalIds])))
        const linked = await tx
          .select({ roleId: CollaborationUsersToRolesSchema.roleId })
          .from(CollaborationUsersToRolesSchema)
          .where(eq(CollaborationUsersToRolesSchema.userId, collabUserId))
        const linkedIds = new Set(linked.map((l) => l.roleId))
        const missing = liveRoles.map((r) => r.id).filter((id) => !linkedIds.has(id))

        if (missing.length) {
          await tx.insert(CollaborationUsersToRolesSchema).values(missing.map((roleId) => ({ userId: collabUserId, roleId })))
        }
        return true
      })
    )
    return result === true
  }

  async moveOrgMembership(args: ScimMoveMembershipArgs): Promise<boolean> {
    const result = await callWithCatch(() =>
      this.db.dbDrizzle.transaction(async (tx) => {
        await tx
          .update(OrganizationMembersSchema)
          .set({ email: args.email })
          .where(and(eq(OrganizationMembersSchema.organizationId, args.orgId), eq(OrganizationMembersSchema.email, args.oldEmail)))

        // collaboration.users is one row per email for the whole instance: only this
        // organization's project links and roles move to the new address, the shared row stays
        const [oldUser] = await tx
          .select({ id: CollaborationUsersSchema.id })
          .from(CollaborationUsersSchema)
          .where(sql`lower(${CollaborationUsersSchema.email}) = ${args.oldEmail}`)
        if (!oldUser) return true

        const links = await tx
          .select({ goalId: CollaborationUsersToGoalsSchema.goalId })
          .from(CollaborationUsersToGoalsSchema)
          .innerJoin(GoalsSchema, eq(GoalsSchema.id, CollaborationUsersToGoalsSchema.goalId))
          .where(and(eq(CollaborationUsersToGoalsSchema.userId, oldUser.id), eq(GoalsSchema.organizationId, args.orgId)))
        const goalIds = links.map((l) => l.goalId)
        if (!goalIds.length) return true

        const [existing] = await tx
          .select({ id: CollaborationUsersSchema.id })
          .from(CollaborationUsersSchema)
          .where(sql`lower(${CollaborationUsersSchema.email}) = ${args.email}`)
        const newUserId = existing?.id
          ?? (await tx.insert(CollaborationUsersSchema).values({ email: args.email }).returning({ id: CollaborationUsersSchema.id }))[0].id

        await tx
          .insert(CollaborationUsersToGoalsSchema)
          .values(goalIds.map((goalId) => ({ userId: newUserId, goalId })))
          .onConflictDoNothing()

        const roles = await tx
          .select({ roleId: CollaborationUsersToRolesSchema.roleId })
          .from(CollaborationUsersToRolesSchema)
          .innerJoin(CollaborationRolesSchema, eq(CollaborationRolesSchema.id, CollaborationUsersToRolesSchema.roleId))
          .where(and(eq(CollaborationUsersToRolesSchema.userId, oldUser.id), inArray(CollaborationRolesSchema.goalId, goalIds)))
        const roleIds = roles.map((r) => r.roleId)
        if (roleIds.length) {
          const already = await tx
            .select({ roleId: CollaborationUsersToRolesSchema.roleId })
            .from(CollaborationUsersToRolesSchema)
            .where(and(eq(CollaborationUsersToRolesSchema.userId, newUserId), inArray(CollaborationUsersToRolesSchema.roleId, roleIds)))
          const alreadyIds = new Set(already.map((r) => r.roleId))
          const missing = roleIds.filter((id) => !alreadyIds.has(id))
          if (missing.length) {
            await tx.insert(CollaborationUsersToRolesSchema).values(missing.map((roleId) => ({ userId: newUserId, roleId })))
          }
          await tx
            .delete(CollaborationUsersToRolesSchema)
            .where(and(eq(CollaborationUsersToRolesSchema.userId, oldUser.id), inArray(CollaborationUsersToRolesSchema.roleId, roleIds)))
        }

        await tx
          .delete(CollaborationUsersToGoalsSchema)
          .where(and(eq(CollaborationUsersToGoalsSchema.userId, oldUser.id), inArray(CollaborationUsersToGoalsSchema.goalId, goalIds)))
        return true
      })
    )
    return result === true
  }
}
