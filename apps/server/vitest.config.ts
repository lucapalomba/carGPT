import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      // Keep a floor under the measured coverage so regressions fail CI rather
      // than slip in silently. Measured 2026-09-24: ~97.3% statements, ~88.5%
      // branches, ~94.4% functions, ~97.5% lines. The thresholds sit ~3 points
      // below that, so new untested branches/lines in covered files fail the
      // build without making unrelated churn fail it.
      thresholds: {
        lines: 93,
        functions: 90,
        branches: 84,
        statements: 93,
      },
    },
  },
});
