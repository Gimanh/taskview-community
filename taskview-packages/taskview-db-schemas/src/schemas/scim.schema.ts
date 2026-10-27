import { sql } from 'drizzle-orm'
import { boolean, index, integer, jsonb, pgSchema, primaryKey, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core'
import { CollaborationRolesSchema } from './collaboration-users.schema'
import { GoalsSchema } from './goals.schema'
import { SsoConfigsSchema } from './sso.schema'

export type ScimSuspendedMembership = {
  role: string
  goals: { goalId: number; roleIds: number[] }[]
  // ISO time of the deactivation; missing in snapshots taken before group links existed
  suspendedAt?: string
}

export const ScimUsersSchema = pgSchema('tv_auth').table('scim_users', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  ssoConfigId: integer('sso_config_id').notNull().references(() => SsoConfigsSchema.id, { onDelete: 'cascade' }),
  scimId: varchar('scim_id', { length: 255 }).notNull(),
  userName: varchar('user_name', { length: 255 }).notNull(),
  externalId: varchar('external_id', { length: 255 }),
  email: varchar({ length: 255 }).notNull(),
  // The address this person holds in the organization. It trails `email` until their
  // account picks up the new address at the next SSO sign-in.
  memberEmail: varchar('member_email', { length: 255 }).notNull(),
  displayName: varchar('display_name', { length: 255 }),
  givenName: varchar('given_name', { length: 255 }),
  familyName: varchar('family_name', { length: 255 }),
  active: boolean().notNull().default(true),
  suspendedMembership: jsonb('suspended_membership').$type<ScimSuspendedMembership | null>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('scim_users_config_scim_id_uidx').on(table.ssoConfigId, table.scimId),
  uniqueIndex('scim_users_config_user_name_uidx').on(table.ssoConfigId, sql`lower(${table.userName})`),
  uniqueIndex('scim_users_config_email_uidx').on(table.ssoConfigId, table.email),
  uniqueIndex('scim_users_config_external_id_uidx').on(table.ssoConfigId, table.externalId).where(sql`${table.externalId} is not null`),
])

export type ScimUsersSchemaTypeForSelect = typeof ScimUsersSchema.$inferSelect
export type ScimUsersSchemaTypeForInsert = typeof ScimUsersSchema.$inferInsert

export const ScimGroupsSchema = pgSchema('tv_auth').table('scim_groups', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  ssoConfigId: integer('sso_config_id').notNull().references(() => SsoConfigsSchema.id, { onDelete: 'cascade' }),
  scimId: varchar('scim_id', { length: 255 }).notNull(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  externalId: varchar('external_id', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('scim_groups_config_scim_id_uidx').on(table.ssoConfigId, table.scimId),
  index('scim_groups_config_display_name_idx').on(table.ssoConfigId, sql`lower(${table.displayName})`),
  uniqueIndex('scim_groups_config_external_id_uidx').on(table.ssoConfigId, table.externalId).where(sql`${table.externalId} is not null`),
])

export type ScimGroupsSchemaTypeForSelect = typeof ScimGroupsSchema.$inferSelect
export type ScimGroupsSchemaTypeForInsert = typeof ScimGroupsSchema.$inferInsert

export const ScimGroupMembersSchema = pgSchema('tv_auth').table('scim_group_members', {
  groupId: integer('group_id').notNull().references(() => ScimGroupsSchema.id, { onDelete: 'cascade' }),
  scimUserId: integer('scim_user_id').notNull().references(() => ScimUsersSchema.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.groupId, table.scimUserId] }),
  index('scim_group_members_scim_user_id_idx').on(table.scimUserId),
])

// People who join the group are added to the project with the role; leaving the group changes nothing
export const ScimGroupProjectsSchema = pgSchema('tv_auth').table('scim_group_projects', {
  groupId: integer('group_id').notNull().references(() => ScimGroupsSchema.id, { onDelete: 'cascade' }),
  goalId: integer('goal_id').notNull().references(() => GoalsSchema.id, { onDelete: 'cascade' }),
  roleId: integer('role_id').notNull().references(() => CollaborationRolesSchema.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.groupId, table.goalId] }),
  index('scim_group_projects_goal_id_idx').on(table.goalId),
])

export type ScimGroupProjectsSchemaTypeForSelect = typeof ScimGroupProjectsSchema.$inferSelect
