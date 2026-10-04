import type { FilesRepository } from '../FilesRepository';
import type { FileStorage } from './FileStorage';
import { HashingStream } from './HashingStream';
import type { FileMigrationReport, FileStorageMigratorArgs } from './storage.types';

const DEFAULT_BATCH_SIZE = 100;

export class FileStorageMigrator {
    private readonly source: FileStorage;
    private readonly target: FileStorage;
    private readonly repository: FilesRepository;
    private readonly batchSize: number;
    private readonly goalId: number | null;

    constructor(args: FileStorageMigratorArgs) {
        if (args.source.provider === args.target.provider) {
            throw new Error('Source and target storage providers must differ');
        }
        this.source = args.source;
        this.target = args.target;
        this.repository = args.repository;
        this.batchSize = args.batchSize ?? DEFAULT_BATCH_SIZE;
        this.goalId = args.goalId ?? null;
    }

    async run(): Promise<FileMigrationReport> {
        const report: FileMigrationReport = { migrated: 0, skipped: 0, cleanupFailed: 0, errors: [] };
        const skippedIds: string[] = [];

        while (true) {
            const batch = await this.repository.listByProvider({
                provider: this.source.provider,
                excludeIds: skippedIds,
                limit: this.batchSize,
                goalId: this.goalId,
            });
            if (batch.length === 0) break;

            for (const file of batch) {
                try {
                    const { stream } = await this.source.get(file.storageKey);
                    const hashing = new HashingStream();
                    stream.on('error', (err) => hashing.destroy(err));
                    hashing.on('error', () => stream.destroy());
                    await this.target.put({ key: file.storageKey, stream: stream.pipe(hashing), mimeType: file.mimeType });

                    if (hashing.digestHex() !== file.checksumSha256) {
                        await this.target.delete(file.storageKey).catch(() => undefined);
                        throw new Error('checksum mismatch');
                    }

                    await this.repository.updateStorageProvider({ fileId: file.id, provider: this.target.provider });
                    report.migrated += 1;

                    try {
                        await this.source.delete(file.storageKey);
                    } catch (err) {
                        report.cleanupFailed += 1;
                        report.errors.push({ fileId: file.id, reason: `cleanup failed: ${(err as Error).message}` });
                    }
                } catch (err) {
                    report.skipped += 1;
                    skippedIds.push(file.id);
                    report.errors.push({ fileId: file.id, reason: (err as Error).message });
                }
            }
        }

        return report;
    }
}
