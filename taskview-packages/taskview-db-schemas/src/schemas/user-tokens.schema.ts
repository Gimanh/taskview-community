import { integer, pgSchema, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core'

export const UserTokensSchema = pgSchema('tv_auth').table('user_tokens', {
  id: serial().primaryKey(),
  userId: integer('user_id').notNull(),
  userIp: varchar('user_ip', { length: 50 }),
  deviceName: varchar('device_name', { length: 200 }),
  userAgent: text('user_agent'),
  timeCreation: timestamp('time_creation').defaultNow(),
  lastUsedAt: timestamp('last_used_at'),
})

export type UserTokensSchemaSelect = typeof UserTokensSchema.$inferSelect
export type UserTokensSchemaInsert = typeof UserTokensSchema.$inferInsert
