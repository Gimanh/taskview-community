import { randomBytes } from 'node:crypto';
import { Readable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { FileStorageConfigReader } from '../storage/FileStorageConfigReader';
import { S3FileStorage } from '../storage/S3FileStorage';
import type { S3FileStorageConfig } from '../storage/storage.types';

// Runs against MinIO from dev-containers-test/docker-compose.minio.yml (see vitest.config.ts env).
const config = FileStorageConfigReader.fromEnv().providers.s3 as S3FileStorageConfig;
const storage = new S3FileStorage(config);
const read = async (stream: Readable) => Buffer.concat(await stream.toArray());

describe('S3FileStorage (MinIO)', () => {
    it('stores, reads, checks and deletes an object by key', async () => {
        const key = `it/${Date.now()}/small`;
        const stored = await storage.put({ key, stream: Readable.from([Buffer.from('payload')]), mimeType: 'text/plain' });
        expect(stored).toEqual({ key, sizeBytes: 7 });

        const got = await storage.get(key);
        expect(got.sizeBytes).toBe(7);
        expect((await read(got.stream)).toString()).toBe('payload');
        expect(await storage.exists(key)).toBe(true);

        await storage.delete(key);
        expect(await storage.exists(key)).toBe(false);
        await expect(storage.get(key)).rejects.toBeTruthy();
    });

    it('streams a file larger than one multipart chunk unchanged', async () => {
        const key = `it/${Date.now()}/large`;
        const payload = randomBytes(6 * 1024 * 1024);
        const stored = await storage.put({ key, stream: Readable.from([payload]), mimeType: 'application/octet-stream' });
        expect(stored.sizeBytes).toBe(payload.length);

        const got = await storage.get(key);
        expect(got.sizeBytes).toBe(payload.length);
        expect((await read(got.stream)).equals(payload)).toBe(true);
        await storage.delete(key);
    }, 30_000);
});
