import { boolean, date, integer, numeric, pgSchema, timestamp, varchar } from "drizzle-orm/pg-core";
import { GoalsSchema } from "./goals.schema";
import { UsersSchema } from "./users.schema";

export type SprintStatus = 'draft' | 'planned' | 'active' | 'review' | 'completed';

export const SprintsSchema = pgSchema('tasks').table('sprints', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    goalId: integer('goal_id').notNull().references(() => GoalsSchema.id, { onDelete: 'cascade' }),
    name: varchar({ length: 255 }).notNull(),
    goalText: varchar('goal_text', { length: 2000 }),
    goalAchieved: boolean('goal_achieved'),
    status: varchar({ length: 20 }).$type<SprintStatus>().notNull().default('draft'),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    capacity: numeric('capacity', { precision: 10, scale: 2 }),
    pausedAt: timestamp('paused_at'),
    creatorId: integer('creator_id').references(() => UsersSchema.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    editedAt: timestamp('edited_at').notNull().defaultNow(),
    reviewStartedAt: timestamp('review_started_at'),
    completedAt: timestamp('completed_at'),
});

export type SprintsSchemaTypeForSelect = typeof SprintsSchema.$inferSelect;
export type SprintsSchemaTypeForInsert = typeof SprintsSchema.$inferInsert;
