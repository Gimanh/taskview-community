import { integer, pgSchema, timestamp, varchar } from "drizzle-orm/pg-core";
import { UsersSchema } from "./users.schema";
import { GoalsSchema } from "./goals.schema";
// import { createInsertSchema, createSelectSchema } from "drizzle-arktype";
// we use this schema only for the database operations
export const GoalsListSchema = pgSchema('tasks').table('goal_lists', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: varchar().notNull(),
    description: varchar(),
    dateCreation: timestamp('date_creation').defaultNow(),
    goalId: integer('goal_id').notNull().references(() => GoalsSchema.id, { onDelete: 'cascade' }),
    owner: integer().references(() => UsersSchema.id, { onDelete: 'cascade' }),
    creatorId: integer('creator_id').notNull().references(() => UsersSchema.id, { onDelete: 'set null' }),
    editDate: timestamp('edit_date'),
    archive: integer().notNull().default(0),
});

export type GoalsListSchemaTypeForSelect = typeof GoalsListSchema.$inferSelect;
export type GoalsListSchemaTypeForInsert = typeof GoalsListSchema.$inferInsert;

// export const GoalsSchemaArkTypeInsert = createInsertSchema(GoalsSchema);
// export const GoalsSchemaArkTypeSelect = createSelectSchema(GoalsSchema);

