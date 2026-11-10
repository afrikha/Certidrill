import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname) } },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["lib/exam/**", "lib/content/**", "lib/questions/**"],
      thresholds: { "lib/exam/**": { lines: 90, functions: 90, branches: 85, statements: 90 } },
    },
  },
});
