import { integer, pgSchema, varchar, boolean, date, time, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from 'drizzle-arktype';
import { UsersSchema } from "./users.schema";

export const TasksSchema = pgSchema('tasks').table('tasks', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    goalId: integer('goal_id').notNull(),
    parentId: integer('parent_id'),
    description: varchar(),
    complete: boolean(),
    goalListId: integer('goal_list_id'),
    creatorId: integer('creator_id'),
    note: varchar(),
    owner: integer().references(() => UsersSchema.id, { onDelete: 'cascade' }),
    priorityId: integer('priority_id').$type<1 | 2 | 3 | null>(),
    startDate: date('start_date'),
    endDate: date('end_date'),
    startTime: time('start_time'),
    endTime: time('end_time'),
    statusId: integer('status_id'), //kanban column id
    taskOrder: integer('task_order'),
    kanbanOrder: integer('kanban_order'),
    amount: integer(),
    transactionType: integer('transaction_type').$type<1 | 0 | null>(),
    nodeGraphPosition: jsonb('node_graph_position'),
});

export type TasksSchemaTypeForSelect = typeof TasksSchema.$inferSelect;

export type TasksSchemaTypeForInsert = typeof TasksSchema.$inferInsert;

export const TasksSchemaArkTypeInsert = createInsertSchema(TasksSchema);