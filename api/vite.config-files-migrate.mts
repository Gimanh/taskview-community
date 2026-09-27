import { defineConfig } from 'vite';
import { VitePluginNode } from 'vite-plugin-node';

// Bundles the file-storage migration CLI next to the server bundle, so a production container
// can run it with plain node: `npm run files:migrate -- --from local --to s3`.
export default defineConfig({
    plugins: [
        ...VitePluginNode({
            adapter: 'express',
            appPath: './src/scripts/files-migrate-storage.ts',
        }),
    ],
    ssr: {
        noExternal: true,
    },
    esbuild: {
        target: 'es2021',
        define: {
            'process.env.NODE_TV_ENV': '"production"',
        },
    },
    build: {
        outDir: 'dist',
        emptyOutDir: false,
        target: "es2021",
        minify: 'terser',
        terserOptions: {
            ecma: 2015,
            compress: true,
            mangle: {
                properties: false,
            },
            format: {
                comments: true,
            },
        },
        rollupOptions: {
            external: ['pg-native'],
            output: {
                format: 'umd',
                entryFileNames: 'taskview-files-migrate.js',
                chunkFileNames: 'taskview-files-migrate-[hash].js',
                assetFileNames: 'taskview-files-migrate-[name]-[hash].[ext]',
            },
        },
    },
});
