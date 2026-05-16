import { boolean, integer, pgSchema, smallint, timestamp, varchar } from 'drizzle-orm/pg-core'
import { createInsertSchema } from 'drizzle-arktype'
import { TasksSchema } from './tasks.schema'
import { GoalsSchema } from './goals.schema'
import { UsersSchema } from './users.schema'

export const TimeEntriesSchema = pgSchema('tasks').table('time_entries', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  taskId: integer('task_id').notNull().references(() => TasksSchema.id, { onDelete: 'cascade' }),
  goalId: integer('goal_id').notNull().references(() => GoalsSchema.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => UsersSchema.id, { onDelete: 'cascade' }),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  endedAt: timestamp('ended_at'),
  durationSeconds: integer('duration_seconds'),
  description: varchar({ length: 500 }),
  source: smallint().$type<0 | 1>().notNull().default(0),
  billable: boolean().notNull().default(true),
  autoStopped: boolean('auto_stopped').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  editedAt: timestamp('edited_at').notNull().defaultNow(),
})

export type TimeEntriesSchemaTypeForSelect = typeof TimeEntriesSchema.$inferSelect
export type TimeEntriesSchemaTypeForInsert = typeof TimeEntriesSchema.$inferInsert

export const TimeEntriesSchemaArkTypeInsert = createInsertSchema(TimeEntriesSchema)
