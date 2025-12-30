import { integer, pgSchema, timestamp, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const GraphRelationsSchema = pgSchema('tasks').table('task_relations', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    fromTaskId: integer('from_task_id'),
    toTaskId: integer('to_task_id'),
    goalId: integer('goal_id'),
    nodeMetadata: jsonb('node_metadata'),
    createdAt: timestamp('created_at').default(sql`now()`),
});
