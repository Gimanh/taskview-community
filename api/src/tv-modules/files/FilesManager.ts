import { randomUUID } from 'node:crypto';
import type { FilesSchemaTypeForSelect } from 'taskview-db-schemas';
import type { AppUser } from '../../core/AppUser';
import { eventBus } from '../../core/EventBus';
import { $logger } from '../../modules/logget';
import { TasksRepository } from '../tasks/TasksRepository';
import { FileDownloadTokens } from './FileDownloadTokens';
import { FilesRepository } from './FilesRepository';
import { FileStorageFactory } from './storage/FileStorageFactory';
import { FileTooLargeError, HashingStream } from './storage/HashingStream';
import {
    FILE_DOWNLOAD_TOKEN_TTL_SECONDS,
    FILE_NAME_MAX_LENGTH,
    type FileContent,
    type FileDownloadUrl,
    type FileDto,
    type FileErrorCode,
    type FileIssueDownloadUrlArgs,
    type FileLinkArgs,
    type FileListArgs,
    type FileListPage,
    type FileRenameArgs,
    type FileResult,
    type FileUnlinkArgs,
    type FileUploadArgs,
} from './types';

const ok = <T>(data: T): FileResult<T> => ({ ok: true, data });
const fail = (code: FileErrorCode, message?: string): FileResult<never> => ({ ok: false, code, message });

export class FilesManager {
    private readonly user: AppUser;
    public readonly repository: FilesRepository;
    private readonly tasksRepository: TasksRepository;

    constructor(user: AppUser) {
        this.user = user;
        this.repository = new FilesRepository();
        this.tasksRepository = new TasksRepository();
    }

    private get initiatorId(): number {
        return this.user.getUserData()?.id as number;
    }

    private get storages(): FileStorageFactory {
        return FileStorageFactory.getInstance();
    }

    get maxFileSizeBytes(): number {
        return this.storages.maxFileSizeBytes;
    }

    async upload(args: FileUploadArgs): Promise<FileResult<FileDto>> {
        if (args.taskId !== null) {
            const task = await this.tasksRepository.fetchTaskByIdNew(args.taskId);
            if (!task) return fail('not_found', 'task not found');
            if (task.goalId !== args.goalId) return fail('forbidden', 'task belongs to another project');
        }

        const storage = this.storages.active();
        const fileId = randomUUID();
        const storageKey = `${args.goalId}/${fileId}`;
        const hashing = new HashingStream(this.maxFileSizeBytes);
        args.stream.on('error', (err) => hashing.destroy(err));

        let sizeBytes: number;
        try {
            const stored = await storage.put({ key: storageKey, stream: args.stream.pipe(hashing), mimeType: args.mimeType });
            sizeBytes = stored.sizeBytes;
        } catch (err) {
            args.stream.resume();
            await storage.delete(storageKey).catch(() => undefined);
            if (err instanceof FileTooLargeError) return fail('too_large', err.message);
            $logger.error(err, '[FilesManager] storage put failed');
            return fail('storage_error');
        }

        let row: FilesSchemaTypeForSelect;
        try {
            row = await this.repository.insert({
                id: fileId,
                goalId: args.goalId,
                uploaderId: args.uploaderId,
                uploaderEmail: args.uploaderEmail,
                name: this.normalizeName(args.originalName),
                originalName: this.normalizeName(args.originalName),
                mimeType: args.mimeType,
                sizeBytes,
                checksumSha256: hashing.digestHex(),
                storageProvider: storage.provider,
                storageKey,
            });
        } catch (err) {
            await storage.delete(storageKey).catch(() => undefined);
            $logger.error(err, '[FilesManager] insert failed');
            return fail('storage_error');
        }

        const linkedTaskIds: number[] = [];
        if (args.taskId !== null) {
            await this.repository.link({
                taskId: args.taskId,
                fileIds: [fileId],
                linkedById: args.uploaderId,
                linkedByEmail: args.uploaderEmail,
            });
            linkedTaskIds.push(args.taskId);
        }

        this.emitChanged(args.goalId, linkedTaskIds);
        return ok(this.toDto(row, linkedTaskIds));
    }

    async listForGoal(args: FileListArgs): Promise<FileListPage> {
        const rows = await this.repository.listForGoal({ ...args, limit: args.limit + 1 });
        const hasMore = rows.length > args.limit;
        const page = hasMore ? rows.slice(0, args.limit) : rows;
        const items = await this.toDtos(page);
        return { items, nextCursor: hasMore ? this.repository.encodeCursor(page[page.length - 1]) : null };
    }

    async listForTask(taskId: number): Promise<FileDto[]> {
        return this.toDtos(await this.repository.listForTask(taskId));
    }

    async getById(fileId: string): Promise<FileDto | null> {
        const row = await this.repository.getById(fileId);
        if (!row) return null;
        const [dto] = await this.toDtos([row]);
        return dto;
    }

    async link(args: FileLinkArgs): Promise<FileResult<FileDto[]>> {
        const task = await this.tasksRepository.fetchTaskByIdNew(args.taskId);
        if (!task) return fail('not_found', 'task not found');

        const files = await this.repository.getByIds(args.fileIds);
        if (files.length !== new Set(args.fileIds).size) return fail('not_found', 'file not found');
        if (files.some((f) => f.goalId !== task.goalId)) return fail('forbidden', 'file belongs to another project');

        await this.repository.link(args);
        this.emitChanged(task.goalId, [args.taskId]);
        return ok(await this.toDtos(files));
    }

    async unlink(args: FileUnlinkArgs): Promise<FileResult<null>> {
        const file = await this.repository.getById(args.fileId);
        if (!file) return fail('not_found');
        const removed = await this.repository.unlink(args);
        if (!removed) return fail('not_found', 'file is not linked to this task');
        this.emitChanged(file.goalId, [args.taskId]);
        return ok(null);
    }

    async rename(args: FileRenameArgs): Promise<FileResult<FileDto>> {
        const current = await this.repository.getById(args.fileId);
        if (!current) return fail('not_found');
        const name = this.keepExtension(this.normalizeName(args.name), current.originalName);
        const row = await this.repository.rename({ fileId: args.fileId, name });
        if (!row) return fail('not_found');
        const linked = await this.repository.linkedTaskIdsFor([row.id]);
        this.emitChanged(row.goalId, linked.get(row.id) ?? []);
        return ok(this.toDto(row, linked.get(row.id) ?? []));
    }

    async deleteForever(fileId: string): Promise<FileResult<null>> {
        const file = await this.repository.getById(fileId);
        if (!file) return fail('not_found');
        const linked = (await this.repository.linkedTaskIdsFor([fileId])).get(fileId) ?? [];

        await this.repository.delete(fileId);
        try {
            await this.storages.get(file.storageProvider).delete(file.storageKey);
        } catch (err) {
            $logger.error(err, `[FilesManager] storage delete failed for ${file.storageKey}`);
        }

        this.emitChanged(file.goalId, linked);
        return ok(null);
    }

    async issueDownloadUrl(args: FileIssueDownloadUrlArgs): Promise<FileResult<FileDownloadUrl>> {
        const file = await this.repository.getById(args.fileId);
        if (!file) return fail('not_found');
        const exp = Math.floor(Date.now() / 1000) + FILE_DOWNLOAD_TOKEN_TTL_SECONDS;
        const token = new FileDownloadTokens().sign({ fileId: file.id, inline: args.inline, exp });
        return ok({ url: `/module/files/content/${token}`, expiresAt: new Date(exp * 1000).toISOString() });
    }

    async openContent(token: string): Promise<FileResult<FileContent>> {
        const payload = new FileDownloadTokens().verify(token);
        if (!payload) return fail('forbidden', 'invalid or expired token');
        const file = await this.repository.getById(payload.fileId);
        if (!file) return fail('not_found');
        try {
            const { stream, sizeBytes } = await this.storages.get(file.storageProvider).get(file.storageKey);
            return ok({ file, stream, sizeBytes: sizeBytes || file.sizeBytes, inline: payload.inline });
        } catch (err) {
            $logger.error(err, `[FilesManager] storage get failed for ${file.storageKey}`);
            return fail('storage_error');
        }
    }

    private emitChanged(goalId: number, taskIds: number[]) {
        eventBus.emit('files.changed', { goalId, taskIds, initiatorId: this.initiatorId });
    }

    private async toDtos(rows: FilesSchemaTypeForSelect[]): Promise<FileDto[]> {
        const linked = await this.repository.linkedTaskIdsFor(rows.map((r) => r.id));
        return rows.map((r) => this.toDto(r, linked.get(r.id) ?? []));
    }

    private toDto(row: FilesSchemaTypeForSelect, linkedTaskIds: number[]): FileDto {
        return {
            id: row.id,
            goalId: row.goalId,
            name: row.name,
            originalName: row.originalName,
            mimeType: row.mimeType,
            sizeBytes: row.sizeBytes,
            uploaderId: row.uploaderId,
            uploaderEmail: row.uploaderEmail,
            createdAt: row.createdAt.toISOString(),
            linkedTaskIds,
        };
    }

    private normalizeName(name: string): string {
        const trimmed = name.replace(/[\\/]/g, '_').replace(/\p{Cc}/gu, '_').trim();
        return this.truncate(trimmed || 'file', FILE_NAME_MAX_LENGTH);
    }

    private keepExtension(name: string, originalName: string): string {
        const dot = originalName.lastIndexOf('.');
        if (dot <= 0) return name;
        const ext = originalName.slice(dot);
        if (name.toLowerCase().endsWith(ext.toLowerCase())) return name;
        const base = this.truncate(name, FILE_NAME_MAX_LENGTH - ext.length);
        return `${base || 'file'}${ext}`;
    }

    private truncate(value: string, max: number): string {
        const points = Array.from(value);
        return points.length <= max ? value : points.slice(0, max).join('');
    }
}
