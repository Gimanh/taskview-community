import { integer, pgSchema, timestamp, varchar } from "drizzle-orm/pg-core";

export const ApiTokensSchema = pgSchema('tv_auth').table('api_tokens', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer('user_id').notNull(),
    name: varchar({ length: 100 }).notNull(),
    tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
    allowedPermissions: varchar('allowed_permissions').array().notNull().default([]),
    allowedGoalIds: integer('allowed_goal_ids').array().notNull().default([]),
    lastUsedAt: timestamp('last_used_at'),
    expiresAt: timestamp('expires_at'),
    createdAt: timestamp('created_at').defaultNow(),
});

export type ApiTokensSchemaTypeForSelect = typeof ApiTokensSchema.$inferSelect;
export type ApiTokensSchemaTypeForInsert = typeof ApiTokensSchema.$inferInsert;
