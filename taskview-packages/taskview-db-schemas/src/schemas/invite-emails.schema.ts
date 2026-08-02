import { integer, pgSchema, timestamp, varchar } from "drizzle-orm/pg-core";
import { GoalsSchema } from "./goals.schema";
import { UsersSchema } from "./users.schema";

export const InviteEmailsSchema = pgSchema('collaboration').table('invite_emails', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    initiatorId: integer('initiator_id').notNull().references(() => UsersSchema.id, { onDelete: 'cascade' }),
    email: varchar({ length: 255 }).notNull(),
    goalId: integer('goal_id').notNull().references(() => GoalsSchema.id, { onDelete: 'cascade' }),
    sentAt: timestamp('sent_at').notNull().defaultNow(),
});

export type InviteEmailsSchemaTypeForSelect = typeof InviteEmailsSchema.$inferSelect;
export type InviteEmailsSchemaTypeForInsert = typeof InviteEmailsSchema.$inferInsert;
