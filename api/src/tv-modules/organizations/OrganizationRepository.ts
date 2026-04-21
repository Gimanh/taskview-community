import { and, eq, inArray, ne } from 'drizzle-orm'
import {
  OrganizationsSchema,
  OrganizationMembersSchema,
  CollaborationUsersSchema,
  CollaborationUsersToGoalsSchema,
  GoalsSchema,
  UsersSchema,
  UserTokensSchema,
  type OrganizationsSchemaTypeForSelect,
  type OrganizationMembersSchemaTypeForSelect,
} from 'taskview-db-schemas'
import { Database } from '../../modules/db'
import { callWithCatch } from '../../utils/helpers'
import type { OrganizationArgCreate, OrganizationArgUpdate } from './types'

export class OrganizationRepository {
  private readonly db: Database

  constructor() {
    this.db = Database.getInstance()
  }

  async create(data: OrganizationArgCreate, userId: number, isPersonal: boolean = false): Promise<OrganizationsSchemaTypeForSelect | false> {
    const result = await callWithCatch(() =>
      this.db.dbDrizzle
        .insert(OrganizationsSchema)
        .values({
          name: data.name,
          slug: data.slug ?? `org-${Date.now()}`,
          ownerId: userId,
          logoUrl: data.logoUrl,
          isPersonal: isPersonal ? 1 : 0,
        })
        .returning()
    )

    if (!result) return false
    return result[0]
  }

  async update(data: OrganizationArgUpdate): Promise<OrganizationsSchemaTypeForSelect | false> {
    const result = await callWithCatch(() =>
      this.db.dbDrizzle
        .update(OrganizationsSchema)
        .set({
          ...(data.name !== undefined && { name: data.name }),
          ...(data.slug !== undefined && { slug: data.slug }),
          ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl }),
          updatedAt: new Date(),
        })
        .where(eq(OrganizationsSchema.id, data.organizationId))
        .returning()
    )

    if (!result) return false
    return result[0]
  }

  async invalidateSessionsForOrgOnlyMembers(orgId: number): Promise<void> {
    await callWithCatch(() =>
      this.db.dbDrizzle.delete(UserTokensSchema).where(
        inArray(
          UserTokensSchema.userId,
          this.db.dbDrizzle
            .select({ id: UsersSchema.id })
            .from(UsersSchema)
            .innerJoin(OrganizationMembersSchema, eq(OrganizationMembersSchema.email, UsersSchema.email))
            .where(eq(OrganizationMembersSchema.organizationId, orgId))
            .except(
              this.db.dbDrizzle
                .select({ id: UsersSchema.id })
                .from(UsersSchema)
                .innerJoin(OrganizationMembersSchema, eq(OrganizationMembersSchema.email, UsersSchema.email))
                .where(ne(OrganizationMembersSchema.organizationId, orgId))
            )
        )
      )
    )
  }

  async delete(orgId: number): Promise<boolean> {
    const result = await callWithCatch(() =>
      this.db.dbDrizzle
        .delete(OrganizationsSchema)
        .where(eq(OrganizationsSchema.id, orgId))
    )

    return !!(result?.rowCount && result.rowCount > 0)
  }

  async findById(orgId: number): Promise<OrganizationsSchemaTypeForSelect | false> {
    const result = await callWithCatch(() =>
      this.db.dbDrizzle
        .select()
        .from(OrganizationsSchema)
        .where(eq(OrganizationsSchema.id, orgId))
    )

    if (!result || result.length === 0) return false
    return result[0]
  }

  async findPersonalForUser(userId: number): Promise<OrganizationsSchemaTypeForSelect | false> {
    const result = await callWithCatch(() =>
      this.db.dbDrizzle
        .select()
        .from(OrganizationsSchema)
        .where(
          and(
            eq(OrganizationsSchema.ownerId, userId),
            eq(OrganizationsSchema.isPersonal, 1),
          )
        )
    )

    if (!result || result.length === 0) return false
    return result[0]
  }

  async findBySlug(slug: string): Promise<OrganizationsSchemaTypeForSelect | false> {
    const result = await callWithCatch(() =>
      this.db.dbDrizzle
        .select()
        .from(OrganizationsSchema)
        .where(eq(OrganizationsSchema.slug, slug))
    )

    if (!result || result.length === 0) return false
    return result[0]
  }

  async fetchForUserByEmail(email: string) {
    const result = await callWithCatch(() =>
      this.db.dbDrizzle
        .select({
          org: OrganizationsSchema,
          role: OrganizationMembersSchema.role,
        })
        .from(OrganizationMembersSchema)
        .innerJoin(OrganizationsSchema, eq(OrganizationMembersSchema.organizationId, OrganizationsSchema.id))
        .where(eq(OrganizationMembersSchema.email, email))
    )

    if (!result) return []
    return result.map(r => ({
      ...r.org,
      currentUserRole: r.role,
    }))
  }

  async addMember(orgId: number, email: string, role: string, invitedBy?: number): Promise<OrganizationMembersSchemaTypeForSelect | false> {
    const result = await callWithCatch(() =>
      this.db.dbDrizzle
        .insert(OrganizationMembersSchema)
        .values({
          organizationId: orgId,
          email: email.toLowerCase(),
          role,
          invitedBy: invitedBy ?? null,
        })
        .onConflictDoNothing()
        .returning()
    )

    if (!result || result.length === 0) return false
    return result[0]
  }

  async updateMemberRole(orgId: number, email: string, role: string): Promise<OrganizationMembersSchemaTypeForSelect | false> {
    const result = await callWithCatch(() =>
      this.db.dbDrizzle
        .update(OrganizationMembersSchema)
        .set({ role })
        .where(
          and(
            eq(OrganizationMembersSchema.organizationId, orgId),
            eq(OrganizationMembersSchema.email, email),
          )
        )
        .returning()
    )

    if (!result || result.length === 0) return false
    return result[0]
  }

  async removeMember(orgId: number, email: string): Promise<boolean> {
    const result = await callWithCatch(() =>
      this.db.dbDrizzle
        .delete(OrganizationMembersSchema)
        .where(
          and(
            eq(OrganizationMembersSchema.organizationId, orgId),
            eq(OrganizationMembersSchema.email, email),
          )
        )
    )

    return !!(result?.rowCount && result.rowCount > 0)
  }

  async fetchMembers(orgId: number): Promise<OrganizationMembersSchemaTypeForSelect[]> {
    const result = await callWithCatch(() =>
      this.db.dbDrizzle
        .select()
        .from(OrganizationMembersSchema)
        .where(eq(OrganizationMembersSchema.organizationId, orgId))
    )

    if (!result) return []
    return result
  }

  async getMemberByEmail(orgId: number, email: string): Promise<OrganizationMembersSchemaTypeForSelect | false> {
    const result = await callWithCatch(() =>
      this.db.dbDrizzle
        .select()
        .from(OrganizationMembersSchema)
        .where(
          and(
            eq(OrganizationMembersSchema.organizationId, orgId),
            eq(OrganizationMembersSchema.email, email),
          )
        )
    )

    if (!result || result.length === 0) return false
    return result[0]
  }

  async removeUserFromOrgGoals(orgId: number, email: string): Promise<void> {
    await callWithCatch(async () => {
      const collabUsers = await this.db.dbDrizzle
        .select({ id: CollaborationUsersSchema.id })
        .from(CollaborationUsersSchema)
        .where(eq(CollaborationUsersSchema.email, email))

      const orgGoals = await this.db.dbDrizzle
        .select({ id: GoalsSchema.id })
        .from(GoalsSchema)
        .where(eq(GoalsSchema.organizationId, orgId))

      const userIds = collabUsers.map(u => u.id)
      const goalIds = orgGoals.map(g => g.id)

      if (userIds.length && goalIds.length) {
        await this.db.dbDrizzle
          .delete(CollaborationUsersToGoalsSchema)
          .where(
            and(
              inArray(CollaborationUsersToGoalsSchema.userId, userIds),
              inArray(CollaborationUsersToGoalsSchema.goalId, goalIds),
            )
          )
      }
    })
  }
}
