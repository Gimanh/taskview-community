import type { Readable } from 'node:stream';
import type { FileStorageProvider } from 'taskview-db-schemas';
import type { FileStorage } from './FileStorage';
import type { FilesRepository } from '../FilesRepository';

export type LocalFileStorageConfig = {
    type: 'local';
    rootDir: string;
};

export type S3FileStorageConfig = {
    type: 's3';
    bucket: string;
    region: string;
    endpoint: string | null;
    accessKeyId: string;
    secretAccessKey: string;
    forcePathStyle: boolean;
};

export type FileStorageProviderConfig = LocalFileStorageConfig | S3FileStorageConfig;

export type FileStorageConfig = {
    maxFileSizeBytes: number;
    active: FileStorageProvider;
    providers: Partial<Record<FileStorageProvider, FileStorageProviderConfig>>;
};

export type StoragePutArgs = {
    key: string;
    stream: Readable;
    mimeType: string;
};

export type StoredObject = {
    key: string;
    sizeBytes: number;
};

export type StorageGetResult = {
    stream: Readable;
    sizeBytes: number;
};

export type FileStorageMigratorArgs = {
    source: FileStorage;
    target: FileStorage;
    repository: FilesRepository;
    batchSize?: number;
    goalId?: number | null;
};

export type FileMigrationError = {
    fileId: string;
    reason: string;
};

export type FileMigrationReport = {
    migrated: number;
    skipped: number;
    cleanupFailed: number;
    errors: FileMigrationError[];
};
