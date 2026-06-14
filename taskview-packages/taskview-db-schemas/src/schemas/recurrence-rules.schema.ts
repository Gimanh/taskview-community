import { boolean, date, integer, pgSchema, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { GoalsSchema } from "./goals.schema";
import { TasksSchema } from "./tasks.schema";
import { UsersSchema } from "./users.schema";

export type RecurrenceState = 'active' | 'paused' | 'ended';

export const RecurrenceRulesSchema = pgSchema('tasks').table('recurrence_rules', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    goalId: integer('goal_id').notNull().references(() => GoalsSchema.id, { onDelete: 'cascade' }),
    templateTaskId: integer('template_task_id').references(() => TasksSchema.id, { onDelete: 'set null' }),
    templateDescription: varchar('template_description', { length: 2000 }),
    templateNote: varchar('template_note', { length: 2000 }),
    templatePriorityId: integer('template_priority_id').$type<1 | 2 | 3 | null>(),
    templateStatusId: integer('template_status_id'),
    templateGoalListId: integer('template_goal_list_id'),
    templateDurationMinutes: integer('template_duration_minutes'),
    rrule: text().notNull(),
    dtstart: timestamp().notNull(),
    hasTime: boolean('has_time').notNull().default(false),
    timezone: varchar({ length: 50 }).notNull(),
    state: varchar({ length: 20 }).$type<RecurrenceState>().notNull().default('active'),
    lastInstanceDate: date('last_instance_date').notNull(),
    instancesCreated: integer('instances_created').notNull().default(1),
    notifyOnOccurrence: boolean('notify_on_occurrence').notNull().default(false),
    creatorId: integer('creator_id').notNull().references(() => UsersSchema.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    editedAt: timestamp('edited_at').notNull().defaultNow(),
});

export type RecurrenceRulesSchemaTypeForSelect = typeof RecurrenceRulesSchema.$inferSelect;
export type RecurrenceRulesSchemaTypeForInsert = typeof RecurrenceRulesSchema.$inferInsert;
