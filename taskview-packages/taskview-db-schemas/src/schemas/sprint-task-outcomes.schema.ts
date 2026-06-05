import { integer, numeric, pgSchema, primaryKey, timestamp, varchar } from "drizzle-orm/pg-core";
import { SprintsSchema } from "./sprints.schema";
import { TasksSchema } from "./tasks.schema";
import { UsersSchema } from "./users.schema";

export type SprintOutcome = 'accepted' | 'carried-over' | 'dropped' | 'incomplete';

export const SprintTaskOutcomesSchema = pgSchema('tasks').table('sprint_task_outcomes', {
    sprintId: integer('sprint_id').notNull().references(() => SprintsSchema.id, { onDelete: 'cascade' }),
    taskId: integer('task_id').notNull().references(() => TasksSchema.id, { onDelete: 'cascade' }),
    outcome: varchar({ length: 20 }).$type<SprintOutcome>().notNull(),
    carriedOverTo: integer('carried_over_to').references(() => SprintsSchema.id, { onDelete: 'set null' }),
    decidedBy: integer('decided_by').references(() => UsersSchema.id),
    decidedAt: timestamp('decided_at').notNull().defaultNow(),
    // Snapshot of the task's estimate captured at sprint close — frozen history.
    estimateValue: numeric('estimate_value', { precision: 10, scale: 2 }),
}, (table) => [
    primaryKey({ columns: [table.sprintId, table.taskId] }),
]);

export type SprintTaskOutcomesSchemaTypeForSelect = typeof SprintTaskOutcomesSchema.$inferSelect;
export type SprintTaskOutcomesSchemaTypeForInsert = typeof SprintTaskOutcomesSchema.$inferInsert;
