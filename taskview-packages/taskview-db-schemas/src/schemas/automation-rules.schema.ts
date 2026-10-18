import { boolean, index, integer, jsonb, pgSchema, serial, timestamp, varchar } from "drizzle-orm/pg-core";
import { GoalsSchema } from "./goals.schema";
import { UsersSchema } from "./users.schema";

export const AutomationRulesSchema = pgSchema('tv_automations').table('rules', {
    id: serial().primaryKey(),
    goalId: integer('goal_id').notNull().references(() => GoalsSchema.id, { onDelete: 'cascade' }),
    creatorId: integer('creator_id').notNull().references(() => UsersSchema.id, { onDelete: 'cascade' }),
    name: varchar({ length: 255 }).notNull(),
    enabled: boolean().notNull().default(true),
    triggerModule: varchar('trigger_module', { length: 64 }).notNull(),
    triggerEvent: varchar('trigger_event', { length: 64 }).notNull(),
    triggerParams: jsonb('trigger_params').$type<Record<string, unknown>>().notNull().default({}),
    actionModule: varchar('action_module', { length: 64 }).notNull(),
    actionName: varchar('action_name', { length: 64 }).notNull(),
    actionParams: jsonb('action_params').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    editedAt: timestamp('edited_at').notNull().defaultNow(),
}, (t) => [
    index('rules_goal_enabled_idx').on(t.goalId, t.enabled),
]);

export type AutomationRulesSchemaTypeForSelect = typeof AutomationRulesSchema.$inferSelect;
export type AutomationRulesSchemaTypeForInsert = typeof AutomationRulesSchema.$inferInsert;
