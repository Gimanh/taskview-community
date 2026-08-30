import { pgSchema, integer, timestamp, varchar } from "drizzle-orm/pg-core";

export const OAuthClientsSchema = pgSchema('tv_auth').table('oauth_clients', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    clientId: varchar('client_id', { length: 64 }).notNull().unique(),
    clientSecretHash: varchar('client_secret_hash', { length: 64 }),
    name: varchar({ length: 200 }).notNull(),
    redirectUris: varchar('redirect_uris').array().notNull().default([]),
    createdVia: varchar('created_via', { length: 16 }).notNull().default('manual'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type OAuthClientsSchemaTypeForSelect = typeof OAuthClientsSchema.$inferSelect;
export type OAuthClientsSchemaTypeForInsert = typeof OAuthClientsSchema.$inferInsert;
