import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
    // Use worker threads instead of child-process forks: on Windows the forks
    // pool occasionally fails to spawn ("Timeout waiting for worker to respond")
    // under load, causing the commit hook to fail spuriously.
    pool: 'threads',
    minWorkers: 1,
    maxWorkers: 1,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      all: true,
      include: ['src/**/*.{ts,tsx}'],
      // main.tsx is the Vite entry and cannot be parsed by the v8 coverage
      // AST parser (rolldown PARSE_ERROR); exclude it from coverage.
      exclude: ['src/main.tsx', 'src/**/*.test.{ts,tsx}', 'src/**/__tests__/**', 'src/**/*.d.ts'],
      // Keep a floor under the measured coverage so regressions fail CI
      // rather than slip in silently. Measured 2026-09-17: ~95.9% statements,
      // ~86.8% branches, ~95.5% functions, ~96.0% lines. The thresholds sit
      // ~3 points below that, so a new untested file fails the build without
      // making unrelated churn fail it.
      thresholds: {
        lines: 93,
        functions: 93,
        branches: 84,
        statements: 93,
      },
    },
  },
});
