import { integer, pgSchema, serial, timestamp, varchar } from "drizzle-orm/pg-core";
import { UsersSchema } from "./users.schema";

export const AccountDeletionSchema = pgSchema('tv_auth').table('account_deletion', {
    id: serial().notNull(),
    code: varchar(),
    userId: integer('user_id').references(() => UsersSchema.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type AccountDeletionSchemaTypeForSelect = typeof AccountDeletionSchema.$inferSelect;
export type AccountDeletionSchemaTypeForInsert = typeof AccountDeletionSchema.$inferInsert;
