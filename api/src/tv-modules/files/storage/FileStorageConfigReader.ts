import type { FileStorageProvider } from 'taskview-db-schemas';
import type { FileQuotaMode } from '../types';
import type {
    FileQuotaConfig,
    FileStorageActiveResolution,
    FileStorageConfig,
    FileStorageProviderConfig,
    FileStorageResolveActiveArgs,
    FileStorageS3Reading,
} from './storage.types';

const DEFAULT_MAX_FILE_SIZE_MB = 10;
const DEFAULT_ORGANIZATION_QUOTA_MB = 100;
const QUOTA_MODES: readonly FileQuotaMode[] = ['off', 'enforce'];
const S3_REQUIRED_VARS = ['FILE_STORAGE_S3_BUCKET', 'FILE_STORAGE_S3_REGION', 'FILE_STORAGE_S3_ACCESS_KEY', 'FILE_STORAGE_S3_SECRET_KEY'] as const;

export const FILE_STORAGE_DOCS_URL = 'https://taskview.tech/docs/configuration/environment-variables#files-task-attachments';

// Attachments are active only when FILE_STORAGE_PROVIDER names a provider AND that provider has all of its settings.
// Anything else leaves the module inactive with a reason, so the API still starts and can explain what is missing.
export class FileStorageConfigReader {
    static fromEnv(env: NodeJS.ProcessEnv = process.env): FileStorageConfig {
        const providers: FileStorageConfig['providers'] = {};

        const local = FileStorageConfigReader.readLocal(env);
        if (local) providers.local = local;
        const s3 = FileStorageConfigReader.readS3(env);
        if (s3.config) providers.s3 = s3.config;

        const { active, inactiveReason } = FileStorageConfigReader.resolveActive({ env, providers, s3Missing: s3.missing });

        const maxMb = Number(env.FILE_MAX_SIZE_MB ?? DEFAULT_MAX_FILE_SIZE_MB);
        return {
            maxFileSizeBytes: (Number.isFinite(maxMb) && maxMb > 0 ? maxMb : DEFAULT_MAX_FILE_SIZE_MB) * 1024 * 1024,
            active,
            inactiveReason,
            providers,
            quota: FileStorageConfigReader.readQuota(env),
        };
    }

    private static readQuota(env: NodeJS.ProcessEnv): FileQuotaConfig {
        const raw = env.FILE_QUOTA_MODE?.trim().toLowerCase() || 'enforce';
        const known = QUOTA_MODES.find((mode) => mode === raw);
        const organizationMb = Number(env.FILE_QUOTA_ORGANIZATION_MB ?? DEFAULT_ORGANIZATION_QUOTA_MB);
        return {
            mode: known ?? 'off',
            defaultOrganizationQuotaBytes: (Number.isFinite(organizationMb) && organizationMb >= 0 ? organizationMb : DEFAULT_ORGANIZATION_QUOTA_MB) * 1024 * 1024,
            invalidModeValue: !known ? (env.FILE_QUOTA_MODE as string) : null,
        };
    }

    private static resolveActive(args: FileStorageResolveActiveArgs): FileStorageActiveResolution {
        const raw = args.env.FILE_STORAGE_PROVIDER?.trim();
        if (!raw) return { active: null, inactiveReason: 'FILE_STORAGE_PROVIDER is not set' };
        if (raw !== 'local' && raw !== 's3') {
            return { active: null, inactiveReason: `FILE_STORAGE_PROVIDER="${raw}" is not supported, use "local" or "s3"` };
        }
        const active: FileStorageProvider = raw;
        if (active === 'local' && !args.providers.local) {
            return { active: null, inactiveReason: 'FILE_STORAGE_PROVIDER=local requires FILE_STORAGE_LOCAL_DIR (in Docker mount it as a volume)' };
        }
        if (active === 's3' && !args.providers.s3) {
            return { active: null, inactiveReason: `FILE_STORAGE_PROVIDER=s3 requires ${args.s3Missing.join(', ')}` };
        }
        return { active, inactiveReason: null };
    }

    private static readLocal(env: NodeJS.ProcessEnv): FileStorageProviderConfig | null {
        const rootDir = env.FILE_STORAGE_LOCAL_DIR?.trim();
        return rootDir ? { type: 'local', rootDir } : null;
    }

    private static readS3(env: NodeJS.ProcessEnv): FileStorageS3Reading {
        const missing = S3_REQUIRED_VARS.filter((name) => !env[name]?.trim());
        if (missing.length > 0) return { config: null, missing };
        return {
            config: {
                type: 's3',
                bucket: env.FILE_STORAGE_S3_BUCKET as string,
                region: env.FILE_STORAGE_S3_REGION as string,
                endpoint: env.FILE_STORAGE_S3_ENDPOINT || null,
                accessKeyId: env.FILE_STORAGE_S3_ACCESS_KEY as string,
                secretAccessKey: env.FILE_STORAGE_S3_SECRET_KEY as string,
                forcePathStyle: env.FILE_STORAGE_S3_FORCE_PATH_STYLE === 'true',
            },
            missing: [],
        };
    }
}
