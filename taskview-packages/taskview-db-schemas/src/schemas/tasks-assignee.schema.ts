import { integer, pgSchema } from "drizzle-orm/pg-core";
import { TasksSchema } from "./tasks.schema";
import { CollaborationUsersSchema } from "./collaboration-users.schema";

export const TasksAssigneeSchema = pgSchema('tasks_auth').table('task_assignee', {
    taskId: integer('task_id').notNull()
        .references(() => TasksSchema.id, { onDelete: 'cascade' }),
    collabUserId: integer('collab_user_id').notNull()
        .references(() => CollaborationUsersSchema.id, { onDelete: 'cascade' }),
});
