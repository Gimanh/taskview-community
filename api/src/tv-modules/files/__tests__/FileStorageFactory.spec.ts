import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { $logger } from '../../../modules/logget';
import { FILE_STORAGE_DOCS_URL } from '../storage/FileStorageConfigReader';
import { FileStorageFactory } from '../storage/FileStorageFactory';
import { FileStorageNotConfiguredError } from '../storage/FileStorageNotConfiguredError';

const STORAGE_VARS = ['FILE_STORAGE_PROVIDER', 'FILE_STORAGE_LOCAL_DIR', 'FILE_STORAGE_S3_BUCKET', 'FILE_QUOTA_MODE'] as const;

describe('FileStorageFactory startup', () => {
    const saved: Partial<Record<(typeof STORAGE_VARS)[number], string | undefined>> = {};

    beforeEach(() => {
        for (const name of STORAGE_VARS) saved[name] = process.env[name];
        FileStorageFactory.resetInstance();
        vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        vi.spyOn(console, 'log').mockImplementation(() => undefined);
        vi.spyOn($logger, 'warn').mockImplementation(() => undefined);
    });

    afterEach(() => {
        for (const name of STORAGE_VARS) {
            if (saved[name] === undefined) delete process.env[name];
            else process.env[name] = saved[name];
        }
        FileStorageFactory.resetInstance();
        vi.restoreAllMocks();
    });

    it('warns on the console and in the log, and refuses the active storage, when no provider is set', () => {
        delete process.env.FILE_STORAGE_PROVIDER;
        delete process.env.FILE_STORAGE_LOCAL_DIR;
        delete process.env.FILE_STORAGE_S3_BUCKET;

        FileStorageFactory.validateOnStartup();

        const expected = expect.stringMatching(/\[files\] File storage is not configured.*FILE_STORAGE_PROVIDER is not set.*FILE_STORAGE_LOCAL_DIR.*FILE_STORAGE_S3_\*/);
        expect(console.warn).toHaveBeenCalledWith(expected);
        expect($logger.warn).toHaveBeenCalledWith(expected);
        expect(console.warn).toHaveBeenCalledWith(expect.stringContaining(FILE_STORAGE_DOCS_URL));

        const factory = FileStorageFactory.getInstance();
        expect(factory.isConfigured).toBe(false);
        expect(factory.status().enabled).toBe(false);
        expect(() => factory.active()).toThrow(FileStorageNotConfiguredError);
    });

    it('names the missing variable when the provider is set but incomplete', () => {
        process.env.FILE_STORAGE_PROVIDER = 'local';
        delete process.env.FILE_STORAGE_LOCAL_DIR;

        FileStorageFactory.validateOnStartup();

        expect($logger.warn).toHaveBeenCalledWith(expect.stringContaining('FILE_STORAGE_PROVIDER=local requires FILE_STORAGE_LOCAL_DIR'));
        expect(FileStorageFactory.getInstance().isConfigured).toBe(false);
    });

    it('stays quiet and serves the active storage when the provider is configured', () => {
        process.env.FILE_STORAGE_PROVIDER = 'local';
        process.env.FILE_STORAGE_LOCAL_DIR = './.test-data/files';

        FileStorageFactory.validateOnStartup();

        expect(console.warn).not.toHaveBeenCalled();
        expect($logger.warn).not.toHaveBeenCalled();
        expect(console.log).toHaveBeenCalledWith('[files] File storage: local');
        const factory = FileStorageFactory.getInstance();
        expect(factory.status()).toEqual({ enabled: true, maxFileSizeBytes: factory.maxFileSizeBytes });
        expect(factory.active().provider).toBe('local');
    });
    it('warns about an unsupported quota mode and keeps quotas off', () => {
        process.env.FILE_STORAGE_PROVIDER = 'local';
        process.env.FILE_STORAGE_LOCAL_DIR = './.test-data/files';
        process.env.FILE_QUOTA_MODE = 'strict';

        FileStorageFactory.validateOnStartup();

        expect($logger.warn).toHaveBeenCalledWith(expect.stringContaining('FILE_QUOTA_MODE="strict" is not supported'));
        expect(FileStorageFactory.getInstance().quota.mode).toBe('off');
    });
});
