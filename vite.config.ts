import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// NOTE: @openstrata/ai-ui-kit is not yet published. Resolve to the sibling
// source for local verification. Remove before production use.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@openstrata/ai-ui-kit': path.resolve(__dirname, '../ai-ui-kit/src/index.ts'),
    },
  },
  server: { port: 5174, proxy: { '/api': 'http://localhost:8088' } },
  build: {
    rollupOptions: {
      external: ['mermaid'],
    },
  },
});
