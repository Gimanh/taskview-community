import { integer, pgSchema, primaryKey } from "drizzle-orm/pg-core";
import { CollaborationUsersSchema } from "./collaboration-users.schema";
import { RecurrenceRulesSchema } from "./recurrence-rules.schema";

export const RecurrenceTemplateAssigneesSchema = pgSchema('tasks').table('recurrence_template_assignees', {
    ruleId: integer('rule_id').notNull().references(() => RecurrenceRulesSchema.id, { onDelete: 'cascade' }),
    collabUserId: integer('collab_user_id').notNull().references(() => CollaborationUsersSchema.id, { onDelete: 'cascade' }),
}, (table) => [
    primaryKey({ columns: [table.ruleId, table.collabUserId] }),
]);

export type RecurrenceTemplateAssigneesSchemaTypeForSelect = typeof RecurrenceTemplateAssigneesSchema.$inferSelect;
export type RecurrenceTemplateAssigneesSchemaTypeForInsert = typeof RecurrenceTemplateAssigneesSchema.$inferInsert;
