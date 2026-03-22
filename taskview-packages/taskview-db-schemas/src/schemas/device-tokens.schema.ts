import { integer, pgSchema, varchar, timestamp } from "drizzle-orm/pg-core";
import { UsersSchema } from "./users.schema";

export const DeviceTokensSchema = pgSchema('tasks').table('device_tokens', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer('user_id').notNull().references(() => UsersSchema.id, { onDelete: 'cascade' }),
    token: varchar({ length: 500 }).notNull(),
    platform: varchar({ length: 20 }).notNull(),
    timezone: varchar({ length: 50 }).notNull().default('UTC'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type DeviceTokensSchemaTypeForSelect = typeof DeviceTokensSchema.$inferSelect;
export type DeviceTokensSchemaTypeForInsert = typeof DeviceTokensSchema.$inferInsert;
