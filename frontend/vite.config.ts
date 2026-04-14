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
    allowedHosts: true,
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
    css: false,
    pool: 'forks',
    poolOptions: {
      forks: {
        maxForks: 2,
        minForks: 1,
      },
    },
    reporter: process.env.CI ? 'default' : 'dot',
    setupFiles: ['./src/test/setup.ts', './src/test/recharts-mock.ts', './src/test/d3-tree-mock.ts'],
    deps: {
      optimizer: {
        web: {
          include: [
            '@mui/material',
            '@mui/icons-material',
            '@mui/x-data-grid',
            '@mui/x-date-pickers',
            '@emotion/react',
            '@emotion/styled',
            'recharts',
            'd3',
            'd3-org-chart',
            '@xyflow/react',
          ],
        },
      },
    },
  },
});
