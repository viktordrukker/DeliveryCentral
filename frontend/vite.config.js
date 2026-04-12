import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
            '@test': path.resolve(__dirname, 'test'),
        },
    },
    server: {
        proxy: {
            '/api': {
                target: 'http://backend:3000',
                changeOrigin: true,
            },
        },
    },
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./src/test/setup.ts', './src/test/recharts-mock.ts', './src/test/d3-tree-mock.ts'],
    },
});
