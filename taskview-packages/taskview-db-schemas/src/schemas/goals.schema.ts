import { integer, pgSchema, timestamp, varchar } from "drizzle-orm/pg-core";
import { UsersSchema } from "./users.schema";
// import { createInsertSchema, createSelectSchema } from "drizzle-arktype";
// we use this schema only for the database operations
export const GoalsSchema = pgSchema('tasks').table('goals', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: varchar(),
    description: varchar(),
    color: varchar(),
    dateCreation: timestamp('date_creation').defaultNow(),
    owner: integer().notNull().references(() => UsersSchema.id, { onDelete: 'cascade' }),
    creatorId: integer('creator_id').references(() => UsersSchema.id, { onDelete: 'set null' }),
    editDate: timestamp('edit_date'),
    archive: integer().notNull().default(0),
    backlogVersion: integer('backlog_version').default(1),
});

export type GoalsSchemaTypeForSelect = typeof GoalsSchema.$inferSelect;
export type GoalsSchemaTypeForInsert = typeof GoalsSchema.$inferInsert;

// export const GoalsSchemaArkTypeInsert = createInsertSchema(GoalsSchema);
// export const GoalsSchemaArkTypeSelect = createSelectSchema(GoalsSchema);

