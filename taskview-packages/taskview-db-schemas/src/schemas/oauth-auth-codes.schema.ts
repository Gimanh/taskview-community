import { pgSchema, integer, timestamp, varchar } from "drizzle-orm/pg-core";

export const OAuthAuthCodesSchema = pgSchema('tv_auth').table('oauth_auth_codes', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    codeHash: varchar('code_hash', { length: 64 }).notNull().unique(),
    clientId: varchar('client_id', { length: 64 }).notNull(),
    userId: integer('user_id').notNull(),
    redirectUri: varchar('redirect_uri').notNull(),
    codeChallenge: varchar('code_challenge', { length: 128 }).notNull(),
    codeChallengeMethod: varchar('code_challenge_method', { length: 8 }).notNull().default('S256'),
    allowedPermissions: varchar('allowed_permissions').array().notNull().default([]),
    allowedGoalIds: integer('allowed_goal_ids').array().notNull().default([]),
    resource: varchar(),
    expiresAt: timestamp('expires_at').notNull(),
    usedAt: timestamp('used_at'),
    grantId: integer('grant_id'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type OAuthAuthCodesSchemaTypeForSelect = typeof OAuthAuthCodesSchema.$inferSelect;
export type OAuthAuthCodesSchemaTypeForInsert = typeof OAuthAuthCodesSchema.$inferInsert;
