import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Coverage over unit + integration tests (spec §11: ≥ 90 % on lib/exam).
 * Needs a disposable PostgreSQL in DATABASE_URL, like the integration tests.
 */
const resolve = { alias: { "@": path.resolve(__dirname), "server-only": path.resolve(__dirname, "tests/stubs/empty.ts") } };

export default defineConfig({
  resolve,
  test: {
    projects: [
      { resolve, test: { name: "unit", include: ["tests/unit/**/*.test.ts"], environment: "node" } },
      { resolve, test: { name: "integration", include: ["tests/integration/**/*.test.ts"], environment: "node", fileParallelism: false, testTimeout: 30_000 } },
    ],
    fileParallelism: false,
    coverage: {
      provider: "v8",
      include: ["lib/exam/**", "lib/content/**", "lib/questions/**"],
      thresholds: { "lib/exam/**": { lines: 90, functions: 90, branches: 85, statements: 90 } },
    },
  },
});
