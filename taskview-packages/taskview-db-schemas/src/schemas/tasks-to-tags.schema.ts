import { integer, pgSchema } from "drizzle-orm/pg-core";
import { TasksSchema } from "./tasks.schema";
import { TagsSchema } from "./tags.schema";

export const TasksToTagsSchema = pgSchema('tasks').table('tasks_to_tags', {
    taskId: integer('task_id').notNull()
        .references(() => TasksSchema.id, { onDelete: 'cascade' }),
    tagId: integer('tag_id').notNull()
        .references(() => TagsSchema.id, { onDelete: 'cascade' }),
});
