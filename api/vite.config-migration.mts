import { defineConfig } from 'vite';
import { VitePluginNode } from 'vite-plugin-node';

export default defineConfig({
    server: {
        port: 1401,
    },
    plugins: [
        ...VitePluginNode({
            adapter: 'express',
            appPath: './src/migrations/migrate.ts',
        }),
    ],
    ssr: {
        noExternal: true,
    },
    esbuild: {
        target: 'es2021',
    },
    build: {
        outDir: 'dist-migration',
        target: "es2021",
        minify: 'terser',
        terserOptions: {
            ecma: 2015,
            compress: true,
            mangle: {
                properties: false,//couse error if true after build
            },
            format: {
                comments: true,
            },
        },
        rollupOptions: {
            external: ['pg-native'],
            output: {
                format: 'umd',
                entryFileNames: 'taskview-db-migration.js',
                chunkFileNames: 'taskview-db-migration-[hash].js',
                assetFileNames: 'taskview-db-migration-[name]-[hash].[ext]',
            },
        },
    },
});