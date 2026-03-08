import { boolean, integer, pgSchema, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { GoalsSchema } from "./goals.schema";
import { TasksSchema } from "./tasks.schema";

export const IntegrationsSchema = pgSchema('tasks').table('integrations', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    provider: varchar({ length: 20 }).notNull(),
    accessTokenEncrypted: varchar('access_token_encrypted'),
    refreshTokenEncrypted: varchar('refresh_token_encrypted'),
    repoExternalId: varchar('repo_external_id', { length: 255 }),
    repoFullName: varchar('repo_full_name', { length: 255 }),
    projectId: integer('project_id').notNull().references(() => GoalsSchema.id, { onDelete: 'cascade' }),
    webhookId: varchar('webhook_id', { length: 255 }),
    webhookSecretEncrypted: varchar('webhook_secret_encrypted'),
    isActive: boolean('is_active').notNull().default(true),
    lastSyncedAt: timestamp('last_synced_at'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const IntegrationTaskMapSchema = pgSchema('tasks').table('integration_task_map', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    integrationId: integer('integration_id').notNull().references(() => IntegrationsSchema.id, { onDelete: 'cascade' }),
    taskId: integer('task_id').notNull().references(() => TasksSchema.id, { onDelete: 'cascade' }),
    issueNumber: integer('issue_number').notNull(),
    issueState: varchar('issue_state', { length: 20 }).notNull().default('open'),
    syncedAt: timestamp('synced_at').defaultNow(),
}, (table) => [
    uniqueIndex('integration_issue_unique').on(table.integrationId, table.issueNumber),
]);

export type IntegrationsSchemaTypeForSelect = typeof IntegrationsSchema.$inferSelect;
export type IntegrationsSchemaTypeForInsert = typeof IntegrationsSchema.$inferInsert;
export type IntegrationTaskMapSchemaTypeForSelect = typeof IntegrationTaskMapSchema.$inferSelect;
export type IntegrationTaskMapSchemaTypeForInsert = typeof IntegrationTaskMapSchema.$inferInsert;
