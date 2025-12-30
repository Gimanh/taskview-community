import { integer, pgSchema, varchar } from "drizzle-orm/pg-core";

export const TagsSchema = pgSchema('tasks').table('tags', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: varchar().notNull(),
    color: varchar().notNull(),
    owner: integer('owner').notNull(),
    goalId: integer('goal_id'),
});


export type TagsSchemaTypeForSelect = typeof TagsSchema.$inferSelect;
export type TagsSchemaTypeForInsert = typeof TagsSchema.$inferInsert;