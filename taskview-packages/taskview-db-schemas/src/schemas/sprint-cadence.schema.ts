import { boolean, date, integer, pgSchema, timestamp, varchar } from "drizzle-orm/pg-core";
import { GoalsSchema } from "./goals.schema";

export const SprintCadenceSchema = pgSchema('tasks').table('sprint_cadence', {
    goalId: integer('goal_id').primaryKey().references(() => GoalsSchema.id, { onDelete: 'cascade' }),
    enabled: boolean().notNull().default(false),
    lengthDays: integer('length_days').notNull().default(14),
    startDate: date('start_date').notNull(),
    lookahead: integer().notNull().default(2),
    nameTemplate: varchar('name_template', { length: 100 }).notNull().default('Sprint {n}'),
    lastGeneratedDate: date('last_generated_date'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    editedAt: timestamp('edited_at').notNull().defaultNow(),
});

export type SprintCadenceSchemaTypeForSelect = typeof SprintCadenceSchema.$inferSelect;
export type SprintCadenceSchemaTypeForInsert = typeof SprintCadenceSchema.$inferInsert;
