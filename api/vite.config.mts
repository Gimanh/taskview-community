import { defineConfig } from 'vite';
import { VitePluginNode } from 'vite-plugin-node';

export default defineConfig({
    server: {
        port: 1401,
    },
    plugins: [
        ...VitePluginNode({
            adapter: 'express',
            appPath: './server.ts',
        }),
    ],
    ssr: {
        noExternal: true,
    },
    esbuild: {
        target: 'es2021',
    },
    build: {
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
            output: {
                format: 'umd',
                entryFileNames: 'taskview-server.js',
                chunkFileNames: 'taskview-server-[hash].js',
                assetFileNames: 'taskview-server-[name]-[hash].[ext]',
            },
        },
    },
});