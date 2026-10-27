import { index, integer, pgSchema, primaryKey, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { FilesSchema } from "./files.schema";
import { TasksSchema } from "./tasks.schema";
import { UsersSchema } from "./users.schema";

export const FileToTaskSchema = pgSchema('tv_files').table('file_to_task', {
    fileId: uuid('file_id').notNull().references(() => FilesSchema.id, { onDelete: 'cascade' }),
    taskId: integer('task_id').notNull().references(() => TasksSchema.id, { onDelete: 'cascade' }),
    linkedById: integer('linked_by_id').references(() => UsersSchema.id, { onDelete: 'set null' }),
    linkedByEmail: varchar('linked_by_email', { length: 255 }).notNull(),
    linkedAt: timestamp('linked_at').notNull().defaultNow(),
}, (t) => [
    primaryKey({ columns: [t.fileId, t.taskId] }),
    index('file_to_task_task_idx').on(t.taskId),
]);

export type FileToTaskSchemaTypeForSelect = typeof FileToTaskSchema.$inferSelect;
export type FileToTaskSchemaTypeForInsert = typeof FileToTaskSchema.$inferInsert;
