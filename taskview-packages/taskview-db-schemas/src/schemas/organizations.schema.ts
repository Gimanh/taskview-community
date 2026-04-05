import { integer, pgSchema, timestamp, unique, varchar } from 'drizzle-orm/pg-core'
import { UsersSchema } from './users.schema'

export const OrganizationsSchema = pgSchema('tv_auth').table('organizations', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar().notNull(),
  slug: varchar().notNull().unique(),
  ownerId: integer('owner_id').notNull().references(() => UsersSchema.id, { onDelete: 'cascade' }),
  logoUrl: varchar('logo_url'),
  isPersonal: integer('is_personal').notNull().default(0),
  plan: varchar().notNull().default('free'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export type OrganizationsSchemaTypeForSelect = typeof OrganizationsSchema.$inferSelect
export type OrganizationsSchemaTypeForInsert = typeof OrganizationsSchema.$inferInsert

export const OrganizationMembersSchema = pgSchema('tv_auth').table('organization_members', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer('organization_id').notNull().references(() => OrganizationsSchema.id, { onDelete: 'cascade' }),
  email: varchar().notNull(),
  role: varchar().notNull().default('member'),
  invitedBy: integer('invited_by').references(() => UsersSchema.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  unique().on(table.organizationId, table.email),
])

export type OrganizationMembersSchemaTypeForSelect = typeof OrganizationMembersSchema.$inferSelect
export type OrganizationMembersSchemaTypeForInsert = typeof OrganizationMembersSchema.$inferInsert
