import { and, desc, eq, ilike, inArray, like, lt, not, notInArray, or, sql, sum, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import {
    FileToTaskSchema,
    FilesSchema,
    type FilesSchemaTypeForSelect,
    GoalsSchema,
    OrganizationsSchema,
} from 'taskview-db-schemas';
import { Database } from '../../modules/db';
import type {
    FileInsertArgs,
    FileInsertWithinQuotaArgs,
    FileLinkRowsArgs,
    FileListArgs,
    FileListByProviderArgs,
    FileListCursor,
    FileQuotaOrganization,
    FileRenameArgs,
    FileUnlinkArgs,
    FileUpdateStorageProviderArgs,
} from './types';

export class FilesRepository {
    private readonly db: Database;

    constructor() {
        this.db = Database.getInstance();
    }

    async insert(args: FileInsertArgs): Promise<FilesSchemaTypeForSelect> {
        const [row] = await this.db.dbDrizzle.insert(FilesSchema).values(args).returning();
        return row;
    }

    async quotaOrganizationForGoal(goalId: number): Promise<FileQuotaOrganization | null> {
        const [row] = await this.db.dbDrizzle
            .select({ organizationId: OrganizationsSchema.id, quotaMb: OrganizationsSchema.fileQuotaMb })
            .from(GoalsSchema)
            .innerJoin(OrganizationsSchema, eq(OrganizationsSchema.id, GoalsSchema.organizationId))
            .where(eq(GoalsSchema.id, goalId))
            .limit(1);
        return row ?? null;
    }

    async usedBytesInOrganization(organizationId: number): Promise<number> {
        const [row] = await this.db.dbDrizzle
            .select({ total: sum(FilesSchema.sizeBytes) })
            .from(FilesSchema)
            .innerJoin(GoalsSchema, eq(GoalsSchema.id, FilesSchema.goalId))
            .where(eq(GoalsSchema.organizationId, organizationId));
        return Number(row?.total ?? 0);
    }

    async insertWithinQuota(args: FileInsertWithinQuotaArgs): Promise<FilesSchemaTypeForSelect | null> {
        return this.db.dbDrizzle.transaction(async (tx) => {
            await tx
                .select({ id: OrganizationsSchema.id })
                .from(OrganizationsSchema)
                .where(eq(OrganizationsSchema.id, args.organizationId))
                .for('update');
            const [usage] = await tx
                .select({ total: sum(FilesSchema.sizeBytes) })
                .from(FilesSchema)
                .innerJoin(GoalsSchema, eq(GoalsSchema.id, FilesSchema.goalId))
                .where(eq(GoalsSchema.organizationId, args.organizationId));
            if (Number(usage?.total ?? 0) + args.row.sizeBytes > args.quotaBytes) return null;
            const [row] = await tx.insert(FilesSchema).values(args.row).returning();
            return row;
        });
    }

    async getById(fileId: string): Promise<FilesSchemaTypeForSelect | null> {
        const [row] = await this.db.dbDrizzle.select().from(FilesSchema).where(eq(FilesSchema.id, fileId)).limit(1);
        return row ?? null;
    }

    async getByIds(fileIds: string[]): Promise<FilesSchemaTypeForSelect[]> {
        if (fileIds.length === 0) return [];
        return this.db.dbDrizzle.select().from(FilesSchema).where(inArray(FilesSchema.id, fileIds));
    }

    async listForGoal(args: FileListArgs): Promise<FilesSchemaTypeForSelect[]> {
        const conditions = [eq(FilesSchema.goalId, args.goalId)];
        if (args.search) conditions.push(ilike(FilesSchema.name, `%${this.escapeLike(args.search)}%`));
        if (args.type === 'image') conditions.push(like(FilesSchema.mimeType, 'image/%'));
        if (args.type === 'document') conditions.push(not(like(FilesSchema.mimeType, 'image/%')));

        const cursor = this.decodeCursor(args.cursor);
        if (cursor) conditions.push(this.beforeCursor(cursor));

        return this.db.dbDrizzle
            .select()
            .from(FilesSchema)
            .where(and(...conditions))
            .orderBy(desc(FilesSchema.createdAt), desc(FilesSchema.id))
            .limit(args.limit);
    }

    async listForTask(taskId: number): Promise<FilesSchemaTypeForSelect[]> {
        const rows = await this.db.dbDrizzle
            .select({ file: FilesSchema })
            .from(FileToTaskSchema)
            .innerJoin(FilesSchema, eq(FileToTaskSchema.fileId, FilesSchema.id))
            .where(eq(FileToTaskSchema.taskId, taskId))
            .orderBy(desc(FileToTaskSchema.linkedAt), desc(FilesSchema.id));
        return rows.map((r) => r.file);
    }

    async listByProvider(args: FileListByProviderArgs): Promise<FilesSchemaTypeForSelect[]> {
        const conditions = [eq(FilesSchema.storageProvider, args.provider)];
        if (args.goalId) conditions.push(eq(FilesSchema.goalId, args.goalId));
        if (args.excludeIds.length > 0) conditions.push(notInArray(FilesSchema.id, args.excludeIds));
        return this.db.dbDrizzle
            .select()
            .from(FilesSchema)
            .where(and(...conditions))
            .orderBy(FilesSchema.createdAt, FilesSchema.id)
            .limit(args.limit);
    }

    async linkedTaskIdsFor(fileIds: string[]): Promise<Map<string, number[]>> {
        const map = new Map<string, number[]>();
        if (fileIds.length === 0) return map;
        const rows = await this.db.dbDrizzle
            .select({ fileId: FileToTaskSchema.fileId, taskId: FileToTaskSchema.taskId })
            .from(FileToTaskSchema)
            .where(inArray(FileToTaskSchema.fileId, fileIds));
        rows.forEach((r) => {
            const list = map.get(r.fileId) ?? [];
            list.push(r.taskId);
            map.set(r.fileId, list);
        });
        return map;
    }

    async countForTasks(taskIds: number[]): Promise<Map<number, number>> {
        const map = new Map<number, number>();
        if (taskIds.length === 0) return map;
        const rows = await this.db.dbDrizzle
            .select({ taskId: FileToTaskSchema.taskId, count: sql<number>`count(*)::int` })
            .from(FileToTaskSchema)
            .where(inArray(FileToTaskSchema.taskId, taskIds))
            .groupBy(FileToTaskSchema.taskId);
        for (const row of rows) map.set(row.taskId, row.count);
        return map;
    }

    async link(args: FileLinkRowsArgs): Promise<void> {
        if (args.fileIds.length === 0) return;
        await this.db.dbDrizzle
            .insert(FileToTaskSchema)
            .values(
                args.fileIds.map((fileId) => ({
                    fileId,
                    taskId: args.taskId,
                    linkedById: args.linkedById,
                    linkedByEmail: args.linkedByEmail,
                }))
            )
            .onConflictDoNothing();
    }

    async unlink(args: FileUnlinkArgs): Promise<boolean> {
        const rows = await this.db.dbDrizzle
            .delete(FileToTaskSchema)
            .where(and(eq(FileToTaskSchema.fileId, args.fileId), eq(FileToTaskSchema.taskId, args.taskId)))
            .returning({ fileId: FileToTaskSchema.fileId });
        return rows.length > 0;
    }

    async rename(args: FileRenameArgs): Promise<FilesSchemaTypeForSelect | null> {
        const [row] = await this.db.dbDrizzle
            .update(FilesSchema)
            .set({ name: args.name, editedAt: new Date() })
            .where(eq(FilesSchema.id, args.fileId))
            .returning();
        return row ?? null;
    }

    async updateStorageProvider(args: FileUpdateStorageProviderArgs): Promise<void> {
        await this.db.dbDrizzle
            .update(FilesSchema)
            .set({ storageProvider: args.provider, editedAt: new Date() })
            .where(eq(FilesSchema.id, args.fileId));
    }

    async delete(fileId: string): Promise<boolean> {
        const rows = await this.db.dbDrizzle
            .delete(FilesSchema)
            .where(eq(FilesSchema.id, fileId))
            .returning({ id: FilesSchema.id });
        return rows.length > 0;
    }

    private beforeCursor(cursor: FileListCursor): SQL {
        const cursorFile = alias(FilesSchema, 'cursor_file');
        const cursorCreatedAt = this.db.dbDrizzle
            .select({ value: cursorFile.createdAt })
            .from(cursorFile)
            .where(eq(cursorFile.id, cursor.id));
        return or(
            lt(FilesSchema.createdAt, cursorCreatedAt),
            and(eq(FilesSchema.createdAt, cursorCreatedAt), lt(FilesSchema.id, cursor.id))
        ) as SQL;
    }

    encodeCursor(file: FilesSchemaTypeForSelect): string {
        return file.id;
    }

    private decodeCursor(raw: string | null): FileListCursor | null {
        if (!raw || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)) return null;
        return { id: raw };
    }

    private escapeLike(value: string): string {
        return value.replace(/[\\%_]/g, (m) => `\\${m}`);
    }
}
