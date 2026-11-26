import { integer, pgSchema, timestamp, varchar } from 'drizzle-orm/pg-core'
import { UsersSchema } from './users.schema'

export const UserOnboardingSchema = pgSchema('tv_auth').table('user_onboarding', {
  userId: integer('user_id').primaryKey().references(() => UsersSchema.id, { onDelete: 'cascade' }),
  status: varchar({ length: 20 }).notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export type UserOnboardingSchemaTypeForSelect = typeof UserOnboardingSchema.$inferSelect
export type UserOnboardingSchemaTypeForInsert = typeof UserOnboardingSchema.$inferInsert
