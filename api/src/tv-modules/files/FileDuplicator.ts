import { randomUUID } from 'node:crypto';
import { $logger } from '../../modules/logget';
import { FileStorageFactory } from './storage/FileStorageFactory';
import type { FileDuplicateArgs, FileInsertArgs } from './types';

export class FileDuplicator {
    private get storages(): FileStorageFactory {
        return FileStorageFactory.getInstance();
    }

    async duplicate(args: FileDuplicateArgs): Promise<FileInsertArgs | null> {
        const { file } = args;
        if (!this.storages.isConfigured || !this.storages.has(file.storageProvider)) return null;

        const target = this.storages.active();
        const id = randomUUID();
        const storageKey = `${args.targetGoalId}/${id}`;
        try {
            const { stream } = await this.storages.get(file.storageProvider).get(file.storageKey);
            const stored = await target.put({ key: storageKey, stream, mimeType: file.mimeType });
            return {
                id,
                goalId: args.targetGoalId,
                uploaderId: args.uploaderId,
                uploaderEmail: args.uploaderEmail,
                name: file.name,
                originalName: file.originalName,
                mimeType: file.mimeType,
                sizeBytes: stored.sizeBytes || file.sizeBytes,
                checksumSha256: file.checksumSha256,
                storageProvider: target.provider,
                storageKey,
            };
        } catch (err) {
            $logger.error(err, `[FileDuplicator] copy failed for ${file.storageKey}`);
            await target.delete(storageKey).catch(() => undefined);
            return null;
        }
    }

    async discard(rows: FileInsertArgs[]): Promise<void> {
        for (const row of rows) {
            try {
                await this.storages.get(row.storageProvider).delete(row.storageKey);
            } catch (err) {
                $logger.error(err, `[FileDuplicator] cleanup failed for ${row.storageKey}`);
            }
        }
    }
}
