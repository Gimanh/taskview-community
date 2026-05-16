import { integer, jsonb, pgSchema, timestamp } from 'drizzle-orm/pg-core'
import { TimeEntriesSchema } from './time-entries.schema'

export const TimeEntriesHistorySchema = pgSchema('history').table('time_entries', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  entryId: integer('entry_id').notNull().references(() => TimeEntriesSchema.id, { onDelete: 'cascade' }),
  editDate: timestamp('edit_date').notNull().defaultNow(),
  entry: jsonb().notNull(),
})

export type TimeEntriesHistorySchemaTypeForSelect = typeof TimeEntriesHistorySchema.$inferSelect
export type TimeEntriesHistorySchemaTypeForInsert = typeof TimeEntriesHistorySchema.$inferInsert
