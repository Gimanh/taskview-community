import { and, asc, count, eq, inArray, ne, notInArray, sql } from 'drizzle-orm'
import {
  ScimGroupMembersSchema,
  ScimGroupsSchema,
  ScimUsersSchema,
  type ScimGroupsSchemaTypeForSelect,
} from 'taskview-db-schemas'
import { Database } from '../../modules/db'
import { callWithCatch } from '../../utils/helpers'
import type {
  ScimFindByScimIdArgs,
  ScimFindGroupArgs,
  ScimFindGroupConflictArgs,
  ScimFindUsersByScimIdsArgs,
  ScimGroupMember,
  ScimListPageArgs,
  ScimInsertGroupArgs,
  ScimReplaceGroupMembersArgs,
  ScimUpdateGroupArgs,
  ScimUserRef,
} from './types'

export class ScimGroupsRepository {
  private readonly db: Database

  constructor() {
    this.db = Database.getInstance()
  }

  async findByScimId(args: ScimFindByScimIdArgs): Promise<ScimGroupsSchemaTypeForSelect | null> {
    const rows = await callWithCatch(() =>
      this.db.dbDrizzle
        .select()
        .from(ScimGroupsSchema)
        .where(and(eq(ScimGroupsSchema.ssoConfigId, args.ssoConfigId), eq(ScimGroupsSchema.scimId, args.scimId)))
    )
    return rows?.[0] ?? null
  }

  // displayName is not unique, so a filter by it may match several groups
  async findByFilter(args: ScimFindGroupArgs): Promise<ScimGroupsSchemaTypeForSelect[]> {
    const { attribute, value } = args.filter
    const condition = attribute === 'displayName'
      ? sql`lower(${ScimGroupsSchema.displayName}) = lower(${value})`
      : eq(ScimGroupsSchema.externalId, value)

    const rows = await callWithCatch(() =>
      this.db.dbDrizzle
        .select()
        .from(ScimGroupsSchema)
        .where(and(eq(ScimGroupsSchema.ssoConfigId, args.ssoConfigId), condition))
        .orderBy(asc(ScimGroupsSchema.id))
    )
    return rows ?? []
  }

  // Only the externalId identifies a group of the identity provider
  async findConflict(args: ScimFindGroupConflictArgs): Promise<ScimGroupsSchemaTypeForSelect | null> {
    const { externalId } = args
    if (!externalId) return null

    const rows = await callWithCatch(() =>
      this.db.dbDrizzle
        .select()
        .from(ScimGroupsSchema)
        .where(and(
          eq(ScimGroupsSchema.ssoConfigId, args.ssoConfigId),
          eq(ScimGroupsSchema.externalId, externalId),
          ...(args.excludeId ? [ne(ScimGroupsSchema.id, args.excludeId)] : []),
        ))
        .limit(1)
    )
    return rows?.[0] ?? null
  }

  async listPage(args: ScimListPageArgs): Promise<ScimGroupsSchemaTypeForSelect[]> {
    const rows = await callWithCatch(() =>
      this.db.dbDrizzle
        .select()
        .from(ScimGroupsSchema)
        .where(eq(ScimGroupsSchema.ssoConfigId, args.ssoConfigId))
        .orderBy(asc(ScimGroupsSchema.id))
        .offset(args.offset)
        .limit(args.limit)
    )
    return rows ?? []
  }

  async countForConfig(ssoConfigId: number): Promise<number> {
    const rows = await callWithCatch(() =>
      this.db.dbDrizzle
        .select({ total: count() })
        .from(ScimGroupsSchema)
        .where(eq(ScimGroupsSchema.ssoConfigId, ssoConfigId))
    )
    return rows?.[0]?.total ?? 0
  }

  async membersOf(groupIds: number[]): Promise<ScimGroupMember[]> {
    if (!groupIds.length) return []
    const rows = await callWithCatch(() =>
      this.db.dbDrizzle
        .select({
          groupId: ScimGroupMembersSchema.groupId,
          scimId: ScimUsersSchema.scimId,
          displayName: ScimUsersSchema.displayName,
          userName: ScimUsersSchema.userName,
        })
        .from(ScimGroupMembersSchema)
        .innerJoin(ScimUsersSchema, eq(ScimUsersSchema.id, ScimGroupMembersSchema.scimUserId))
        .where(inArray(ScimGroupMembersSchema.groupId, groupIds))
        .orderBy(asc(ScimUsersSchema.id))
    )
    return (rows ?? []).map((row) => ({ groupId: row.groupId, scimId: row.scimId, display: row.displayName ?? row.userName }))
  }

  async memberIds(groupId: number): Promise<number[]> {
    const rows = await callWithCatch(() =>
      this.db.dbDrizzle
        .select({ scimUserId: ScimGroupMembersSchema.scimUserId })
        .from(ScimGroupMembersSchema)
        .where(eq(ScimGroupMembersSchema.groupId, groupId))
    )
    return (rows ?? []).map((row) => row.scimUserId)
  }

  async findUsersByScimIds(args: ScimFindUsersByScimIdsArgs): Promise<ScimUserRef[]> {
    if (!args.scimIds.length) return []
    const rows = await callWithCatch(() =>
      this.db.dbDrizzle
        .select({ id: ScimUsersSchema.id, scimId: ScimUsersSchema.scimId })
        .from(ScimUsersSchema)
        .where(and(eq(ScimUsersSchema.ssoConfigId, args.ssoConfigId), inArray(ScimUsersSchema.scimId, args.scimIds)))
    )
    return rows ?? []
  }

  async insert(args: ScimInsertGroupArgs): Promise<ScimGroupsSchemaTypeForSelect | null> {
    const rows = await callWithCatch(() =>
      this.db.dbDrizzle.transaction(async (tx) => {
        const [group] = await tx.insert(ScimGroupsSchema).values(args.values).returning()
        await this.replaceMembers({ tx, groupId: group.id, scimUserIds: args.scimUserIds })
        return [group]
      })
    )
    return rows?.[0] ?? null
  }

  async update(args: ScimUpdateGroupArgs): Promise<ScimGroupsSchemaTypeForSelect | null> {
    const rows = await callWithCatch(() =>
      this.db.dbDrizzle.transaction(async (tx) => {
        const updated = await tx
          .update(ScimGroupsSchema)
          .set({
            displayName: args.values.displayName,
            externalId: args.values.externalId,
            updatedAt: new Date(),
          })
          .where(eq(ScimGroupsSchema.id, args.id))
          .returning()
        await this.replaceMembers({ tx, groupId: args.id, scimUserIds: args.scimUserIds })
        return updated
      })
    )
    return rows?.[0] ?? null
  }

  private async replaceMembers(args: ScimReplaceGroupMembersArgs) {
    const { tx, groupId, scimUserIds } = args
    await tx
      .delete(ScimGroupMembersSchema)
      .where(and(
        eq(ScimGroupMembersSchema.groupId, groupId),
        ...(scimUserIds.length ? [notInArray(ScimGroupMembersSchema.scimUserId, scimUserIds)] : []),
      ))
    if (scimUserIds.length) {
      await tx
        .insert(ScimGroupMembersSchema)
        .values(scimUserIds.map((scimUserId) => ({ groupId, scimUserId })))
        .onConflictDoNothing()
    }
  }

  async deleteById(id: number): Promise<boolean> {
    const result = await callWithCatch(() =>
      this.db.dbDrizzle.delete(ScimGroupsSchema).where(eq(ScimGroupsSchema.id, id))
    )
    return !!(result?.rowCount && result.rowCount > 0)
  }
}
