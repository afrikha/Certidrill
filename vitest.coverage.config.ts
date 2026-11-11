import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

/**
 * Coverage over unit + integration + component tests.
 * Thresholds: ≥ 80 % on the whole measured code, ≥ 90 % on lib/exam (spec §11).
 * Needs a disposable PostgreSQL in DATABASE_URL, like the integration tests.
 *
 * Measured: lib/**, components/**, app/api/** (route handlers).
 * Not measured here: Next.js pages and layouts (app/**\/page.tsx…), which are
 * server-rendered wiring covered by the Playwright end-to-end suite.
 */
const resolve = { alias: { "@": path.resolve(__dirname), "server-only": path.resolve(__dirname, "tests/stubs/empty.ts") } };

export default defineConfig({
  plugins: [react()],
  resolve,
  test: {
    projects: [
      { resolve, test: { name: "unit", include: ["tests/unit/**/*.test.ts"], environment: "node" } },
      { resolve, test: { name: "integration", include: ["tests/integration/**/*.test.ts"], environment: "node", fileParallelism: false, testTimeout: 30_000 } },
      {
        plugins: [react()],
        resolve,
        test: { name: "components", include: ["tests/components/**/*.test.tsx"], environment: "jsdom", setupFiles: ["tests/components/setup.ts"] },
      },
    ],
    fileParallelism: false,
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "text", "lcov", "html"],
      include: ["lib/**", "components/**", "app/api/**"],
      exclude: ["**/*.d.ts", "lib/db.ts", "tests/**"],
      thresholds: {
        lines: 80,
        statements: 80,
        functions: 80,
        branches: 70,
        "lib/exam/**": { lines: 90, functions: 90, branches: 85, statements: 90 },
      },
    },
  },
});
