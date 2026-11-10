import { defineConfig } from "vitest/config";
import path from "node:path";

// Integration tests run against a real PostgreSQL (DATABASE_URL must point to a
// disposable database: tables are truncated).
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname) } },
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
