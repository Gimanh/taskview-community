import type { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import type { FileStorage } from './FileStorage';
import { HashingStream } from './HashingStream';
import type { S3FileStorageConfig, StorageGetResult, StoragePutArgs, StoredObject } from './storage.types';

export class S3FileStorage implements FileStorage {
    readonly provider = 's3' as const;
    private readonly client: S3Client;
    private readonly bucket: string;

    constructor(config: S3FileStorageConfig) {
        this.bucket = config.bucket;
        this.client = new S3Client({
            region: config.region,
            endpoint: config.endpoint ?? undefined,
            forcePathStyle: config.forcePathStyle,
            credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
        });
    }

    async put(args: StoragePutArgs): Promise<StoredObject> {
        const counter = new HashingStream();
        // pipeline (not pipe) so a failure of the source stream reaches the upload instead of hanging it.
        const feeding = pipeline(args.stream, counter);
        const upload = new Upload({
            client: this.client,
            params: { Bucket: this.bucket, Key: args.key, Body: counter, ContentType: args.mimeType },
        });
        try {
            await Promise.all([feeding, upload.done()]);
        } catch (err) {
            await upload.abort().catch(() => undefined);
            throw err;
        }
        return { key: args.key, sizeBytes: counter.sizeBytes };
    }

    async get(key: string): Promise<StorageGetResult> {
        const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
        if (!result.Body) throw new Error(`Empty body for storage key ${key}`);
        return { stream: result.Body as Readable, sizeBytes: result.ContentLength ?? 0 };
    }

    async delete(key: string): Promise<void> {
        await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    }

    async exists(key: string): Promise<boolean> {
        try {
            await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
            return true;
        } catch (err) {
            if (this.isNotFound(err)) return false;
            throw err;
        }
    }

    private isNotFound(err: unknown): boolean {
        const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
        return e?.name === 'NotFound' || e?.name === 'NoSuchKey' || e?.$metadata?.httpStatusCode === 404;
    }
}
