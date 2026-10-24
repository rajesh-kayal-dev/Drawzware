import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './apps/web/src'),
      '@drawzware/contracts': path.resolve(__dirname, './packages/contracts/src'),
      '@drawzware/domain': path.resolve(__dirname, './packages/domain/src'),
      '@drawzware/canvas-core': path.resolve(__dirname, './packages/canvas-core/src'),
      '@drawzware/storage': path.resolve(__dirname, './packages/storage/src'),
      '@drawzware/ui': path.resolve(__dirname, './packages/ui/src'),
    },
  },
});
