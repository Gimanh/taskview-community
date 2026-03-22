import { boolean, integer, jsonb, pgSchema, timestamp, varchar } from "drizzle-orm/pg-core";
import { GoalsSchema } from "./goals.schema";

export const WebhooksSchema = pgSchema('tasks').table('webhooks', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    goalId: integer('goal_id').notNull().references(() => GoalsSchema.id, { onDelete: 'cascade' }),
    url: varchar({ length: 500 }).notNull(),
    secretEncrypted: varchar('secret_encrypted').notNull(),
    events: varchar().array().notNull().default([]),
    isActive: boolean('is_active').notNull().default(true),
    consecutiveFailures: integer('consecutive_failures').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const WebhookDeliveriesSchema = pgSchema('tasks').table('webhook_deliveries', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    webhookId: integer('webhook_id').notNull().references(() => WebhooksSchema.id, { onDelete: 'cascade' }),
    event: varchar({ length: 50 }).notNull(),
    payload: jsonb().notNull(),
    status: varchar({ length: 20 }).notNull().default('pending'),
    responseCode: integer('response_code'),
    attempts: integer().notNull().default(0),
    lastAttemptAt: timestamp('last_attempt_at'),
    createdAt: timestamp('created_at').defaultNow(),
});

export type WebhooksSchemaTypeForSelect = typeof WebhooksSchema.$inferSelect;
export type WebhooksSchemaTypeForInsert = typeof WebhooksSchema.$inferInsert;
export type WebhookDeliveriesSchemaTypeForSelect = typeof WebhookDeliveriesSchema.$inferSelect;
