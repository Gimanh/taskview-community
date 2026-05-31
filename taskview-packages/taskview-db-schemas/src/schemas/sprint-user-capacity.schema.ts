import { integer, numeric, pgSchema, primaryKey } from "drizzle-orm/pg-core";
import { SprintsSchema } from "./sprints.schema";
import { UsersSchema } from "./users.schema";

export const SprintUserCapacitySchema = pgSchema('tasks').table('sprint_user_capacity', {
    sprintId: integer('sprint_id').notNull().references(() => SprintsSchema.id, { onDelete: 'cascade' }),
    userId: integer('user_id').notNull().references(() => UsersSchema.id, { onDelete: 'cascade' }),
    hours: numeric({ precision: 10, scale: 2 }).notNull(),
}, (table) => [
    primaryKey({ columns: [table.sprintId, table.userId] }),
]);

export type SprintUserCapacitySchemaTypeForSelect = typeof SprintUserCapacitySchema.$inferSelect;
export type SprintUserCapacitySchemaTypeForInsert = typeof SprintUserCapacitySchema.$inferInsert;
