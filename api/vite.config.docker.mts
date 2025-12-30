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
        define: {
            'process.env.NODE_TV_ENV': '"production"',
        },
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
            external: ['pg-native'],
            output: {
                format: 'umd',
                entryFileNames: 'taskview-server-docker.js',
                chunkFileNames: 'taskview-server-docker-[hash].js',
                assetFileNames: 'taskview-server-docker-[name]-[hash].[ext]',
            },
        },
    },
});