import { date, integer, pgSchema, primaryKey, timestamp } from "drizzle-orm/pg-core";
import { RecurrenceRulesSchema } from "./recurrence-rules.schema";

export const RecurrenceSkipDatesSchema = pgSchema('tasks').table('recurrence_skip_dates', {
    ruleId: integer('rule_id').notNull().references(() => RecurrenceRulesSchema.id, { onDelete: 'cascade' }),
    skipDate: date('skip_date').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
    primaryKey({ columns: [table.ruleId, table.skipDate] }),
]);

export type RecurrenceSkipDatesSchemaTypeForSelect = typeof RecurrenceSkipDatesSchema.$inferSelect;
export type RecurrenceSkipDatesSchemaTypeForInsert = typeof RecurrenceSkipDatesSchema.$inferInsert;
