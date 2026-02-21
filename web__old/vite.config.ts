import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';

// https://vitejs.dev/config/
export default defineConfig({
    define: {
        APP_VERSION: JSON.stringify(process.env.npm_package_version),
    },
    build: {
        target: 'ESNext',
    },
    server: {
        host: 'localhost',
        port: 3000,
    },
    plugins: [vue(), vueJsx()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
});
