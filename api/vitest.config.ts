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
            ...conf,
            APP_URL: 'http://localhost:3000',
        },
    },
});
