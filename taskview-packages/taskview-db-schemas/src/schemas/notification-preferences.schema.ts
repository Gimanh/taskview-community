import { integer, pgSchema, jsonb } from "drizzle-orm/pg-core";
import { UsersSchema } from "./users.schema";

export const NotificationPreferencesSchema = pgSchema('tasks').table('notification_preferences', {
    userId: integer('user_id').primaryKey().references(() => UsersSchema.id, { onDelete: 'cascade' }),
    settings: jsonb().notNull().default({}),
});

export type NotificationPreferencesSchemaTypeForSelect = typeof NotificationPreferencesSchema.$inferSelect;
export type NotificationPreferencesSchemaTypeForInsert = typeof NotificationPreferencesSchema.$inferInsert;
