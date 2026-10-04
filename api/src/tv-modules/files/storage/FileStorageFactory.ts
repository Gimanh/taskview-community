import type { FileStorageProvider } from 'taskview-db-schemas';
import { $logger } from '../../../modules/logget';
import type { FileStorageStatusDto } from '../types';
import type { FileStorage } from './FileStorage';
import { FILE_STORAGE_DOCS_URL, FileStorageConfigReader } from './FileStorageConfigReader';
import { FileStorageNotConfiguredError } from './FileStorageNotConfiguredError';
import { LocalFileStorage } from './LocalFileStorage';
import { S3FileStorage } from './S3FileStorage';
import type { FileStorageConfig, FileStorageProviderConfig } from './storage.types';

export class FileStorageFactory {
    private static instance: FileStorageFactory | null = null;
    private readonly config: FileStorageConfig;
    private readonly storages = new Map<FileStorageProvider, FileStorage>();

    constructor(config: FileStorageConfig) {
        this.config = config;
        for (const providerConfig of Object.values(config.providers)) {
            const storage = FileStorageFactory.build(providerConfig);
            this.storages.set(storage.provider, storage);
        }
    }

    static getInstance(): FileStorageFactory {
        if (!FileStorageFactory.instance) {
            FileStorageFactory.instance = new FileStorageFactory(FileStorageConfigReader.fromEnv());
        }
        return FileStorageFactory.instance;
    }

    static resetInstance(): void {
        FileStorageFactory.instance = null;
    }

    static validateOnStartup(): void {
        const factory = FileStorageFactory.getInstance();
        if (factory.isConfigured) {
            console.log(`[files] File storage: ${factory.config.active}`);
            return;
        }
        const message =
            `[files] File storage is not configured - task attachments are disabled (${factory.inactiveReason}). ` +
            'To enable them set FILE_STORAGE_PROVIDER=local with FILE_STORAGE_LOCAL_DIR (mount it as a volume in Docker), ' +
            `or FILE_STORAGE_PROVIDER=s3 with the FILE_STORAGE_S3_* variables. See ${FILE_STORAGE_DOCS_URL}`;
        console.warn(message);
        $logger.warn(message);
    }

    static build(config: FileStorageProviderConfig): FileStorage {
        switch (config.type) {
            case 'local':
                return new LocalFileStorage(config);
            case 's3':
                return new S3FileStorage(config);
        }
    }

    get maxFileSizeBytes(): number {
        return this.config.maxFileSizeBytes;
    }

    get isConfigured(): boolean {
        return this.config.active !== null;
    }

    get inactiveReason(): string | null {
        return this.config.inactiveReason;
    }

    status(): FileStorageStatusDto {
        return { enabled: this.isConfigured, maxFileSizeBytes: this.config.maxFileSizeBytes };
    }

    active(): FileStorage {
        if (this.config.active === null) throw new FileStorageNotConfiguredError(this.config.inactiveReason ?? 'unknown reason');
        return this.get(this.config.active);
    }

    get(provider: FileStorageProvider): FileStorage {
        const storage = this.storages.get(provider);
        if (!storage) throw new Error(`File storage provider is not configured: ${provider}`);
        return storage;
    }

    has(provider: FileStorageProvider): boolean {
        return this.storages.has(provider);
    }
}
