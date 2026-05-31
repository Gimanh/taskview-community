import { integer, pgSchema, text, timestamp } from "drizzle-orm/pg-core";
import { SprintsSchema } from "./sprints.schema";
import { UsersSchema } from "./users.schema";

export const SprintRetrosSchema = pgSchema('tasks').table('sprint_retros', {
    sprintId: integer('sprint_id').primaryKey().references(() => SprintsSchema.id, { onDelete: 'cascade' }),
    wentWell: text('went_well'),
    wentBad: text('went_bad'),
    actionItems: text('action_items'),
    editedAt: timestamp('edited_at').notNull().defaultNow(),
    editedBy: integer('edited_by').references(() => UsersSchema.id),
});

export type SprintRetrosSchemaTypeForSelect = typeof SprintRetrosSchema.$inferSelect;
export type SprintRetrosSchemaTypeForInsert = typeof SprintRetrosSchema.$inferInsert;
