import { bigint, index, integer, pgSchema, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { GoalsSchema } from "./goals.schema";
import { UsersSchema } from "./users.schema";

export type FileStorageProvider = 'local' | 's3';

export const FilesSchema = pgSchema('tv_files').table('files', {
    id: uuid().primaryKey().defaultRandom(),
    goalId: integer('goal_id').notNull().references(() => GoalsSchema.id, { onDelete: 'cascade' }),
    uploaderId: integer('uploader_id').references(() => UsersSchema.id, { onDelete: 'set null' }),
    uploaderEmail: varchar('uploader_email', { length: 255 }).notNull(),
    name: varchar({ length: 255 }).notNull(),
    originalName: varchar('original_name', { length: 255 }).notNull(),
    mimeType: varchar('mime_type', { length: 255 }).notNull(),
    sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
    checksumSha256: varchar('checksum_sha256', { length: 64 }).notNull(),
    storageProvider: varchar('storage_provider', { length: 20 }).$type<FileStorageProvider>().notNull(),
    storageKey: varchar('storage_key', { length: 512 }).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    editedAt: timestamp('edited_at').notNull().defaultNow(),
}, (t) => [
    index('files_goal_created_idx').on(t.goalId, t.createdAt),
    index('files_goal_name_idx').on(t.goalId, t.name),
    index('files_provider_idx').on(t.storageProvider),
]);

export type FilesSchemaTypeForSelect = typeof FilesSchema.$inferSelect;
export type FilesSchemaTypeForInsert = typeof FilesSchema.$inferInsert;
