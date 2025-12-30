import { integer, pgSchema, varchar } from "drizzle-orm/pg-core";
import { GoalsSchema } from "./goals.schema";

export const TasksStatusesSchema = pgSchema('tasks').table('statuses', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: varchar().notNull(),
    goalId: integer('goal_id').notNull().references(() => GoalsSchema.id, { onDelete: 'cascade' }),
    columnVersion: integer('column_version'),
});


export type TasksStatusesSchemaTypeForSelect = typeof TasksStatusesSchema.$inferSelect;
export type TasksStatusesSchemaTypeForInsert = typeof TasksStatusesSchema.$inferInsert;