import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

// React component tests (Testing Library + jsdom), no database needed.
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname), "server-only": path.resolve(__dirname, "tests/stubs/empty.ts") } },
  test: { include: ["tests/components/**/*.test.tsx"], environment: "jsdom", setupFiles: ["tests/components/setup.ts"] },
});
