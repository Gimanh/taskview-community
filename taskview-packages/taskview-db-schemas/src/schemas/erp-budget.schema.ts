import { boolean, doublePrecision, integer, jsonb, pgSchema, timestamp, varchar } from 'drizzle-orm/pg-core';
import { GoalsSchema } from './goals.schema';
import { OrganizationsSchema } from './organizations.schema';

export const ErpPgSchema = pgSchema('tasks');

export const ErpConfigurationsSchema = ErpPgSchema.table('erp_configurations', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer('organization_id').notNull().references(() => OrganizationsSchema.id, { onDelete: 'cascade' }),
    erpSystem: varchar('erp_system', { length: 50 }).$type<'sap' | 'oracle_netsuite' | 'dynamics365' | 'generic_rest'>().notNull().default('sap'),
    apiUrl: varchar('api_url', { length: 1000 }).default(''),
    apiKey: varchar('api_key', { length: 500 }).default(''),
    webhookSecret: varchar('webhook_secret', { length: 255 }).default(''),
    syncFrequency: varchar('sync_frequency', { length: 50 }).$type<'hourly' | 'daily' | 'weekly' | 'manual'>().default('daily'),
    isEnabled: boolean('is_enabled').notNull().default(true),
    lastSyncAt: timestamp('last_sync_at'),
    metadata: jsonb('metadata').$type<Record<string, any>>().default({}),
    createdDate: timestamp('created_date').defaultNow(),
    updatedDate: timestamp('updated_date').defaultNow(),
});

export const ErpBudgetsSchema = ErpPgSchema.table('erp_budgets', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    goalId: integer('goal_id').notNull().references(() => GoalsSchema.id, { onDelete: 'cascade' }),
    organizationId: integer('organization_id').notNull().references(() => OrganizationsSchema.id, { onDelete: 'cascade' }),
    erpCostCenter: varchar('erp_cost_center', { length: 100 }).notNull().default('CC-MAIN'),
    erpWbsElement: varchar('erp_wbs_element', { length: 100 }).notNull().default('WBS-001'),
    fiscalYear: integer('fiscal_year').notNull().default(2026),
    allocatedBudget: doublePrecision('allocated_budget').notNull().default(0),
    committedSpend: doublePrecision('committed_spend').notNull().default(0),
    actualSpend: doublePrecision('actual_spend').notNull().default(0),
    currency: varchar({ length: 10 }).notNull().default('USD'),
    lastSyncedAt: timestamp('last_synced_at').defaultNow(),
    updatedDate: timestamp('updated_date').defaultNow(),
});

export const ErpTransactionsSchema = ErpPgSchema.table('erp_transactions', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    erpBudgetId: integer('erp_budget_id').notNull().references(() => ErpBudgetsSchema.id, { onDelete: 'cascade' }),
    transactionDate: timestamp('transaction_date').notNull().defaultNow(),
    referenceDoc: varchar('reference_doc', { length: 100 }).notNull(),
    vendor: varchar({ length: 255 }).default(''),
    amount: doublePrecision().notNull(),
    transactionType: varchar('transaction_type', { length: 50 }).$type<'actual' | 'committed' | 'budget_transfer'>().notNull().default('actual'),
    description: varchar({ length: 1000 }).default(''),
    createdDate: timestamp('created_date').defaultNow(),
});

export type ErpConfigurationsTypeForSelect = typeof ErpConfigurationsSchema.$inferSelect;
export type ErpConfigurationsTypeForInsert = typeof ErpConfigurationsSchema.$inferInsert;
export type ErpBudgetsTypeForSelect = typeof ErpBudgetsSchema.$inferSelect;
export type ErpBudgetsTypeForInsert = typeof ErpBudgetsSchema.$inferInsert;
export type ErpTransactionsTypeForSelect = typeof ErpTransactionsSchema.$inferSelect;
export type ErpTransactionsTypeForInsert = typeof ErpTransactionsSchema.$inferInsert;
