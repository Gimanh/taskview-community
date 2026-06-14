import { integer, pgSchema, primaryKey } from "drizzle-orm/pg-core";
import { RecurrenceRulesSchema } from "./recurrence-rules.schema";
import { TagsSchema } from "./tags.schema";

export const RecurrenceTemplateTagsSchema = pgSchema('tasks').table('recurrence_template_tags', {
    ruleId: integer('rule_id').notNull().references(() => RecurrenceRulesSchema.id, { onDelete: 'cascade' }),
    tagId: integer('tag_id').notNull().references(() => TagsSchema.id, { onDelete: 'cascade' }),
}, (table) => [
    primaryKey({ columns: [table.ruleId, table.tagId] }),
]);

export type RecurrenceTemplateTagsSchemaTypeForSelect = typeof RecurrenceTemplateTagsSchema.$inferSelect;
export type RecurrenceTemplateTagsSchemaTypeForInsert = typeof RecurrenceTemplateTagsSchema.$inferInsert;
