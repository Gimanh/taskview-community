import { integer, pgSchema, timestamp } from "drizzle-orm/pg-core";
import { UsersSchema } from "./users.schema";

export const LoginCodeRequestsSchema = pgSchema('tv_auth').table('login_code_requests', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer('user_id').notNull().references(() => UsersSchema.id, { onDelete: 'cascade' }),
    requestedAt: timestamp('requested_at').notNull().defaultNow(),
});

export type LoginCodeRequestsSchemaTypeForSelect = typeof LoginCodeRequestsSchema.$inferSelect;
export type LoginCodeRequestsSchemaTypeForInsert = typeof LoginCodeRequestsSchema.$inferInsert;
