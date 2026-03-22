import { integer, pgSchema, varchar, boolean, timestamp } from "drizzle-orm/pg-core";
import { TasksSchema } from "./tasks.schema";
import { UsersSchema } from "./users.schema";

export const NotificationsSchema = pgSchema('tasks').table('notifications', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer('user_id').notNull().references(() => UsersSchema.id, { onDelete: 'cascade' }),
    taskId: integer('task_id').references(() => TasksSchema.id, { onDelete: 'set null' }),
    type: varchar({ length: 50 }).notNull().default('deadline'),
    title: varchar({ length: 255 }).notNull(),
    body: varchar({ length: 1000 }),
    read: boolean().notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type NotificationsSchemaTypeForSelect = typeof NotificationsSchema.$inferSelect;
export type NotificationsSchemaTypeForInsert = typeof NotificationsSchema.$inferInsert;
