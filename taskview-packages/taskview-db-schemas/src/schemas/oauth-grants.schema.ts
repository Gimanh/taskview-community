import { pgSchema, integer, timestamp, varchar } from "drizzle-orm/pg-core";

export const OAuthGrantsSchema = pgSchema('tv_auth').table('oauth_grants', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer('user_id').notNull(),
    clientId: varchar('client_id', { length: 64 }).notNull(),
    allowedPermissions: varchar('allowed_permissions').array().notNull().default([]),
    allowedGoalIds: integer('allowed_goal_ids').array().notNull().default([]),
    resource: varchar(),
    refreshTokenHash: varchar('refresh_token_hash', { length: 64 }),
    refreshTokenPrevHash: varchar('refresh_token_prev_hash', { length: 64 }),
    refreshExpiresAt: timestamp('refresh_expires_at'),
    lastUsedAt: timestamp('last_used_at'),
    revokedAt: timestamp('revoked_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type OAuthGrantsSchemaTypeForSelect = typeof OAuthGrantsSchema.$inferSelect;
export type OAuthGrantsSchemaTypeForInsert = typeof OAuthGrantsSchema.$inferInsert;
