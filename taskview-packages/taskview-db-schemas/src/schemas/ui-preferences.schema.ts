import { integer, jsonb, pgSchema, timestamp } from 'drizzle-orm/pg-core'
import { UsersSchema } from './users.schema'

export const UiPreferencesSchema = pgSchema('tv_auth').table('ui_preferences', {
  userId: integer('user_id').primaryKey().references(() => UsersSchema.id, { onDelete: 'cascade' }),
  prefs: jsonb().notNull().default({}),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export type UiPreferencesSchemaTypeForSelect = typeof UiPreferencesSchema.$inferSelect
export type UiPreferencesSchemaTypeForInsert = typeof UiPreferencesSchema.$inferInsert
