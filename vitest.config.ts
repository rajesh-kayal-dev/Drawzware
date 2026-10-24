import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'apps/api/tests/**/*.test.ts'],
    env: {
      JWT_SECRET: 'test-secret',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './apps/web/src'),
      '@drawzware/contracts': path.resolve(__dirname, './packages/contracts/src'),
      '@drawzware/domain': path.resolve(__dirname, './packages/domain/src'),
      '@drawzware/canvas-core': path.resolve(__dirname, './packages/canvas-core/src'),
      '@drawzware/storage': path.resolve(__dirname, './packages/storage/src'),
      '@drawzware/api': path.resolve(__dirname, './apps/api/src'),
    },
  },
});
