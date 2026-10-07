import { createHash } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import type { FilesSchemaTypeForSelect, FileStorageProvider } from 'taskview-db-schemas';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FilesRepository } from '../FilesRepository';
import type { FileStorage } from '../storage/FileStorage';
import { FileStorageMigrator } from '../storage/FileStorageMigrator';
import { LocalFileStorage } from '../storage/LocalFileStorage';
import type { FileListByProviderArgs, FileUpdateStorageProviderArgs } from '../types';

class FakeS3Storage implements FileStorage {
    readonly provider = 's3' as const;
    private readonly inner: LocalFileStorage;

    constructor(rootDir: string) {
        this.inner = new LocalFileStorage({ type: 'local', rootDir });
    }

    put(args: Parameters<FileStorage['put']>[0]) { return this.inner.put(args); }
    get(key: string) { return this.inner.get(key); }
    delete(key: string) { return this.inner.delete(key); }
    exists(key: string) { return this.inner.exists(key); }
}

class InMemoryFilesRepository {
    rows: FilesSchemaTypeForSelect[] = [];

    async listByProvider(args: FileListByProviderArgs) {
        return this.rows
            .filter((r) => r.storageProvider === args.provider && !args.excludeIds.includes(r.id))
            .slice(0, args.limit);
    }

    async updateStorageProvider(args: FileUpdateStorageProviderArgs) {
        const row = this.rows.find((r) => r.id === args.fileId);
        if (row) row.storageProvider = args.provider;
    }
}

const row = (id: string, goalId: number, checksum: string, provider: FileStorageProvider): FilesSchemaTypeForSelect => ({
    id,
    goalId,
    uploaderId: 1,
    uploaderEmail: 'u@example.com',
    name: `${id}.txt`,
    originalName: `${id}.txt`,
    mimeType: 'text/plain',
    sizeBytes: 0,
    checksumSha256: checksum,
    storageProvider: provider,
    storageKey: `${goalId}/${id}`,
    createdAt: new Date(),
    editedAt: new Date(),
});

const sha = (s: string) => createHash('sha256').update(s).digest('hex');

describe('FileStorageMigrator', () => {
    let dirA = '';
    let dirB = '';
    let source: FileStorage;
    let target: FileStorage;
    let repository: InMemoryFilesRepository;

    beforeEach(async () => {
        dirA = await mkdtemp(join(tmpdir(), 'tv-mig-a-'));
        dirB = await mkdtemp(join(tmpdir(), 'tv-mig-b-'));
        source = new LocalFileStorage({ type: 'local', rootDir: dirA });
        target = new FakeS3Storage(dirB);
        repository = new InMemoryFilesRepository();
    });

    afterEach(async () => {
        await rm(dirA, { recursive: true, force: true });
        await rm(dirB, { recursive: true, force: true });
    });

    const migrator = () =>
        new FileStorageMigrator({ source, target, repository: repository as unknown as FilesRepository, batchSize: 2 });

    it('moves every file, switches the row and removes the source copy', async () => {
        for (const id of ['a', 'b', 'c']) {
            await source.put({ key: `1/${id}`, stream: Readable.from([Buffer.from(`content-${id}`)]), mimeType: 'text/plain' });
            repository.rows.push(row(id, 1, sha(`content-${id}`), 'local'));
        }

        const report = await migrator().run();

        expect(report).toEqual({ migrated: 3, skipped: 0, cleanupFailed: 0, errors: [] });
        for (const id of ['a', 'b', 'c']) {
            expect(await source.exists(`1/${id}`)).toBe(false);
            expect(await target.exists(`1/${id}`)).toBe(true);
            expect(repository.rows.find((r) => r.id === id)?.storageProvider).toBe('s3');
        }
    });

    it('skips a file whose content does not match its checksum and keeps the source', async () => {
        await source.put({ key: '1/ok', stream: Readable.from([Buffer.from('good')]), mimeType: 'text/plain' });
        await source.put({ key: '1/bad', stream: Readable.from([Buffer.from('tampered')]), mimeType: 'text/plain' });
        repository.rows.push(row('ok', 1, sha('good'), 'local'), row('bad', 1, sha('original'), 'local'));

        const report = await migrator().run();

        expect(report.migrated).toBe(1);
        expect(report.skipped).toBe(1);
        expect(report.errors).toEqual([{ fileId: 'bad', reason: 'checksum mismatch' }]);
        expect(await source.exists('1/bad')).toBe(true);
        expect(await target.exists('1/bad')).toBe(false);
        expect(repository.rows.find((r) => r.id === 'bad')?.storageProvider).toBe('local');
    });

    it('is idempotent: a second run has nothing to do and reversing moves files back', async () => {
        await source.put({ key: '1/x', stream: Readable.from([Buffer.from('x')]), mimeType: 'text/plain' });
        repository.rows.push(row('x', 1, sha('x'), 'local'));

        expect((await migrator().run()).migrated).toBe(1);
        expect((await migrator().run()).migrated).toBe(0);

        const back = new FileStorageMigrator({ source: target, target: source, repository: repository as unknown as FilesRepository });
        expect((await back.run()).migrated).toBe(1);
        expect(await source.exists('1/x')).toBe(true);
        expect(repository.rows[0].storageProvider).toBe('local');
    });

    it('reports a file whose source stream fails mid-transfer instead of hanging', async () => {
        await source.put({ key: '1/ok', stream: Readable.from([Buffer.from('good')]), mimeType: 'text/plain' });
        repository.rows.push(row('broken', 1, sha('whatever'), 'local'), row('ok', 1, sha('good'), 'local'));
        const failingSource: FileStorage = {
            provider: 'local',
            put: (args) => source.put(args),
            delete: (key) => source.delete(key),
            exists: (key) => source.exists(key),
            get: async (key) => {
                if (key !== '1/broken') return source.get(key);
                const stream = new Readable({
                    read() {
                        this.push(Buffer.from('partial'));
                        this.destroy(new Error('connection reset'));
                    },
                });
                return { stream, sizeBytes: 100 };
            },
        };
        const migrator = new FileStorageMigrator({ source: failingSource, target, repository: repository as unknown as FilesRepository });

        const report = await migrator.run();

        expect(report.migrated).toBe(1);
        expect(report.skipped).toBe(1);
        expect(report.errors).toEqual([{ fileId: 'broken', reason: 'connection reset' }]);
        expect(await target.exists('1/broken')).toBe(false);
        expect(repository.rows.find((r) => r.id === 'broken')?.storageProvider).toBe('local');
    });

    it('refuses identical providers', () => {
        expect(() => new FileStorageMigrator({ source, target: source, repository: repository as unknown as FilesRepository })).toThrow('must differ');
    });
});
