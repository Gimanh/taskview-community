import { defineConfig } from 'vitest/config';
import { conf } from './conf.private';

export default defineConfig({
    test: {
        testTimeout: 5000,
        env: {
            NODE_ENV: 'development',
            DB_HOST: 'localhost',
            DB_USER: 'postgres',
            DB_PASSWORD: '12345678pqow',
            DB_NAME: 'tv_3_dev_db',
            DB_PORT: '5432',
            APP_PORT: '1401',
            JWT_SIGN: '29873kjLIJ*&(*uklkjh#$&*&)',
            ACCESS_LIFE_TIME: '5d',
            REFRESH_LIFE_TIME: '3s',
            JWT_ALG: 'HS256',
            ENCRYPTION_KEY: 'ab'.repeat(32),
            FILE_STORAGE_PROVIDER: 'local',
            FILE_STORAGE_LOCAL_DIR: './.test-data/files',
            FILE_MAX_SIZE_MB: '1',
            // MinIO from dev-containers-test/docker-compose.minio.yml
            FILE_STORAGE_S3_BUCKET: 'taskview-test',
            FILE_STORAGE_S3_REGION: 'us-east-1',
            FILE_STORAGE_S3_ENDPOINT: 'http://localhost:9000',
            FILE_STORAGE_S3_ACCESS_KEY: 'minioadmin',
            FILE_STORAGE_S3_SECRET_KEY: 'minioadmin',
            FILE_STORAGE_S3_FORCE_PATH_STYLE: 'true',
            ...conf,
            APP_URL: 'http://localhost:3000',
        },
    },
});
