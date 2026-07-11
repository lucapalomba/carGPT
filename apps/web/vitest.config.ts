import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    // Use worker threads instead of child-process forks: on Windows the forks
    // pool occasionally fails to spawn ("Timeout waiting for worker to respond")
    // under load, causing the commit hook to fail spuriously.
    pool: 'threads',
    minWorkers: 1,
    maxWorkers: 1,
  },
});
