import { defineConfig } from 'vitest/config';

// Tests live in a __tests__/ folder beside each script. Coverage covers this
// skill's own maintenance scripts and must stay at 80% or above. Generated
// evaluation projects under evals/ are never discovered or measured.
export default defineConfig({
  test: {
    include: ['scripts/**/__tests__/**/*.test.ts'],
    environment: 'node',
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['scripts/**/*.{js,cjs,mjs,ts}'],
      exclude: ['scripts/**/__tests__/**'],
      reportsDirectory: '.coverage',
      reporter: ['text', 'json-summary', 'lcov'],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
