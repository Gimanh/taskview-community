import { sql } from "drizzle-orm";
import { index, integer, jsonb, pgSchema, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { GoalsSchema } from "./goals.schema";
import { OrganizationsSchema } from "./organizations.schema";
import { UsersSchema } from "./users.schema";

export type ImportJobStatus = 'draft' | 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export const ImportJobsSchema = pgSchema('tasks').table('import_jobs', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer('organization_id').notNull().references(() => OrganizationsSchema.id, { onDelete: 'cascade' }),
    createdBy: integer('created_by').notNull().references(() => UsersSchema.id, { onDelete: 'cascade' }),
    provider: varchar({ length: 32 }).notNull(),
    status: varchar({ length: 20 }).$type<ImportJobStatus>().notNull().default('draft'),
    credentialsEncrypted: text('credentials_encrypted'),
    accountName: varchar('account_name', { length: 255 }),
    externalProjectId: varchar('external_project_id', { length: 255 }),
    externalProjectName: varchar('external_project_name', { length: 255 }),
    goalId: integer('goal_id').references(() => GoalsSchema.id, { onDelete: 'set null' }),
    config: jsonb(),
    progress: jsonb(),
    stats: jsonb(),
    error: varchar({ length: 1000 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    startedAt: timestamp('started_at'),
    finishedAt: timestamp('finished_at'),
}, (table) => [
    index('import_jobs_org_creator_idx').on(table.organizationId, table.createdBy, table.createdAt),
    index('import_jobs_status_created_idx').on(table.status, table.createdAt),
    uniqueIndex('import_jobs_one_active_per_user_idx').on(table.createdBy).where(sql`status IN ('pending', 'running')`),
]);

export type ImportJobsSchemaTypeForSelect = typeof ImportJobsSchema.$inferSelect;
export type ImportJobsSchemaTypeForInsert = typeof ImportJobsSchema.$inferInsert;
