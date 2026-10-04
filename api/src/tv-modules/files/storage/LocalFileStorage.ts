import { createReadStream, createWriteStream } from 'node:fs';
import { access, mkdir, rename, stat, unlink } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { pipeline } from 'node:stream/promises';
import type { FileStorage } from './FileStorage';
import type { LocalFileStorageConfig, StorageGetResult, StoragePutArgs, StoredObject } from './storage.types';

export class LocalFileStorage implements FileStorage {
    readonly provider = 'local' as const;
    private readonly rootDir: string;

    constructor(config: LocalFileStorageConfig) {
        this.rootDir = resolve(config.rootDir);
    }

    async put(args: StoragePutArgs): Promise<StoredObject> {
        const finalPath = this.resolveKey(args.key);
        const tempPath = `${finalPath}.part`;
        await mkdir(dirname(finalPath), { recursive: true });
        try {
            await pipeline(args.stream, createWriteStream(tempPath));
            await rename(tempPath, finalPath);
        } catch (err) {
            await unlink(tempPath).catch(() => undefined);
            throw err;
        }
        const info = await stat(finalPath);
        return { key: args.key, sizeBytes: info.size };
    }

    async get(key: string): Promise<StorageGetResult> {
        const path = this.resolveKey(key);
        const info = await stat(path);
        return { stream: createReadStream(path), sizeBytes: info.size };
    }

    async delete(key: string): Promise<void> {
        await unlink(this.resolveKey(key)).catch((err: NodeJS.ErrnoException) => {
            if (err.code !== 'ENOENT') throw err;
        });
    }

    async exists(key: string): Promise<boolean> {
        return access(this.resolveKey(key))
            .then(() => true)
            .catch(() => false);
    }

    private resolveKey(key: string): string {
        const path = resolve(join(this.rootDir, key));
        if (!path.startsWith(this.rootDir + sep)) {
            throw new Error(`Storage key escapes the root directory: ${key}`);
        }
        return path;
    }
}
