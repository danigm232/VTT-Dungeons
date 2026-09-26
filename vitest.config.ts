import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['engine/**/*.test.ts'],
    environment: 'node',
    // Integration-heavy Babylon/socket/persistence tests can exceed Vitest's
    // 5 s default when the suite runs in parallel on Windows CI/dev machines.
    // A generous per-test ceiling avoids false failures without hiding hangs.
    testTimeout: 30_000,
    hookTimeout: 30_000
  }
});
