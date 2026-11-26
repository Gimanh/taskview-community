import { integer, pgSchema, timestamp, varchar } from 'drizzle-orm/pg-core'

export const LoginAttemptsSchema = pgSchema('tv_auth').table('login_attempts', {
  key: varchar({ length: 80 }).primaryKey(),
  failures: integer().notNull(),
  windowStartedAt: timestamp('window_started_at').notNull().defaultNow(),
})

export type LoginAttemptsSchemaTypeForSelect = typeof LoginAttemptsSchema.$inferSelect
export type LoginAttemptsSchemaTypeForInsert = typeof LoginAttemptsSchema.$inferInsert
