import { defineConfig } from 'vite'
import { resolve } from 'path'
import dts from 'vite-plugin-dts';

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'TaskViewSchemas',
            fileName: (format) => `taskview-db-schemas.${format}.js`,
            formats: ['es', 'umd', 'cjs']
        },
        rollupOptions: {
            external: ['arktype', 'drizzle-arktype'],
            output: {
                globals: {},
                exports: 'named'
            }
        },
        sourcemap: true,
        minify: 'terser',
        target: 'es2020'
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src')
        }
    },
    esbuild: {
        target: 'es2020'
    },
    plugins: [
        dts({
            insertTypesEntry: true,
            outDir: 'dist',
        }),
    ]
}) 