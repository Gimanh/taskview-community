import { boolean, integer, pgSchema, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { UsersSchema } from "./users.schema";

export const MessagingConnectionsSchema = pgSchema('tasks').table('messaging_connections', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    provider: varchar({ length: 20 }).notNull(),
    ownerType: varchar('owner_type', { length: 20 }).notNull(),
    ownerId: integer('owner_id').notNull(),
    targetChatId: varchar('target_chat_id', { length: 255 }).notNull(),
    title: varchar({ length: 255 }),
    externalTeamId: varchar('external_team_id', { length: 255 }),
    accessTokenEncrypted: varchar('access_token_encrypted'),
    events: varchar().array().notNull().default(['task.created', 'task.assigned', 'task.statusChanged', 'task.completed']),
    // Project channels only: whether to include the RBAC-gated task description in the
    // channel message. Default on — a channel is a deliberate broadcast; owners who care
    // about COMPONENT_CAN_WATCH_CONTENT turn it off. Personal DMs always gate per-recipient.
    postContent: boolean('post_content').notNull().default(true),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
    uniqueIndex('messaging_connection_unique').on(table.provider, table.ownerType, table.ownerId, table.targetChatId),
]);

// Pending binding intent for any owner (user / project / organization). A user
// generates a token in TaskView, then redeems it from the messenger (deep-link
// for personal, /connect in a group for project). Consumed on redemption.
export const MessagingLinkTokensSchema = pgSchema('tasks').table('messaging_link_tokens', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    token: varchar({ length: 128 }).notNull().unique(),
    provider: varchar({ length: 20 }).notNull(),
    ownerType: varchar('owner_type', { length: 20 }).notNull(),
    ownerId: integer('owner_id').notNull(),
    createdBy: integer('created_by').notNull().references(() => UsersSchema.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
});

// Pure identity: which external account belongs to which TaskView user. Populated
// when a personal connection is bound; reused later to resolve inbound commands.
export const MessagingIdentityMapSchema = pgSchema('tasks').table('messaging_identity_map', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer('user_id').notNull().references(() => UsersSchema.id, { onDelete: 'cascade' }),
    provider: varchar({ length: 20 }).notNull(),
    externalUserId: varchar('external_user_id', { length: 255 }),
    // Slack user IDs are unique only WITHIN a workspace, so identity must be keyed by
    // (provider, team, user). Null for Telegram, whose user IDs are globally unique.
    externalTeamId: varchar('external_team_id', { length: 255 }),
    linkedAt: timestamp('linked_at'),
    createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
    uniqueIndex('messaging_identity_unique').on(table.userId, table.provider),
]);

export type MessagingConnectionsSchemaTypeForSelect = typeof MessagingConnectionsSchema.$inferSelect;
export type MessagingConnectionsSchemaTypeForInsert = typeof MessagingConnectionsSchema.$inferInsert;
export type MessagingLinkTokensSchemaTypeForSelect = typeof MessagingLinkTokensSchema.$inferSelect;
export type MessagingIdentityMapSchemaTypeForSelect = typeof MessagingIdentityMapSchema.$inferSelect;
