import { describe, expect, it } from 'vitest';
import { FileStorageConfigReader } from '../storage/FileStorageConfigReader';

const s3Env = {
    FILE_STORAGE_S3_BUCKET: 'b',
    FILE_STORAGE_S3_REGION: 'r',
    FILE_STORAGE_S3_ACCESS_KEY: 'a',
    FILE_STORAGE_S3_SECRET_KEY: 's',
};

describe('FileStorageConfigReader', () => {
    it('is inactive when no provider is named, even if provider settings exist', () => {
        const empty = FileStorageConfigReader.fromEnv({});
        expect(empty.active).toBeNull();
        expect(empty.inactiveReason).toContain('FILE_STORAGE_PROVIDER is not set');
        expect(empty.maxFileSizeBytes).toBe(50 * 1024 * 1024);
        expect(empty.providers).toEqual({});

        const described = FileStorageConfigReader.fromEnv({ FILE_STORAGE_LOCAL_DIR: '/var/files', ...s3Env });
        expect(described.active).toBeNull();
        expect(described.providers.local).toEqual({ type: 'local', rootDir: '/var/files' });
        expect(described.providers.s3).toMatchObject({ type: 's3', bucket: 'b' });
    });

    it('activates local only with an explicit directory', () => {
        const withDir = FileStorageConfigReader.fromEnv({ FILE_STORAGE_PROVIDER: 'local', FILE_STORAGE_LOCAL_DIR: './data/files' });
        expect(withDir.active).toBe('local');
        expect(withDir.inactiveReason).toBeNull();

        const noDir = FileStorageConfigReader.fromEnv({ FILE_STORAGE_PROVIDER: 'local' });
        expect(noDir.active).toBeNull();
        expect(noDir.inactiveReason).toContain('FILE_STORAGE_LOCAL_DIR');
        expect(noDir.providers.local).toBeUndefined();
    });

    it('configures both providers when both are described, with s3 active', () => {
        const config = FileStorageConfigReader.fromEnv({
            FILE_STORAGE_PROVIDER: 's3',
            FILE_STORAGE_LOCAL_DIR: '/var/files',
            FILE_STORAGE_S3_ENDPOINT: 'http://minio:9000',
            FILE_STORAGE_S3_FORCE_PATH_STYLE: 'true',
            FILE_MAX_SIZE_MB: '5',
            ...s3Env,
        });
        expect(config.active).toBe('s3');
        expect(config.maxFileSizeBytes).toBe(5 * 1024 * 1024);
        expect(config.providers.local).toEqual({ type: 'local', rootDir: '/var/files' });
        expect(config.providers.s3).toMatchObject({ type: 's3', bucket: 'b', endpoint: 'http://minio:9000', forcePathStyle: true });
    });

    it('does not configure local when s3 is active and no local dir is given', () => {
        const config = FileStorageConfigReader.fromEnv({ FILE_STORAGE_PROVIDER: 's3', ...s3Env });
        expect(config.providers.local).toBeUndefined();
    });

    it('is inactive with the missing variables listed when s3 is named but incomplete', () => {
        const config = FileStorageConfigReader.fromEnv({ FILE_STORAGE_PROVIDER: 's3', FILE_STORAGE_S3_BUCKET: 'b' });
        expect(config.active).toBeNull();
        expect(config.inactiveReason).toContain('FILE_STORAGE_S3_REGION');
        expect(config.inactiveReason).toContain('FILE_STORAGE_S3_SECRET_KEY');
        expect(config.inactiveReason).not.toContain('FILE_STORAGE_S3_BUCKET');
    });

    it('is inactive for an unknown provider instead of throwing', () => {
        const config = FileStorageConfigReader.fromEnv({ FILE_STORAGE_PROVIDER: 'ftp' });
        expect(config.active).toBeNull();
        expect(config.inactiveReason).toContain('"ftp" is not supported');
    });
});
