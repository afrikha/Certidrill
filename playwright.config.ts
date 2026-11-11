import { defineConfig, devices } from "@playwright/test";

// E2E tests run against a production build. DATABASE_URL must point to a
// disposable database: global setup migrates, seeds and creates a test admin.
const PORT = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "off",
    locale: "en-US",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } }],
  webServer: {
    command: `npm run build && node tools/start-standalone.mjs`,
    url: `http://localhost:${PORT}/api/health`,
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
    env: { PORT: String(PORT), AUTH_URL: `http://localhost:${PORT}`, AUTH_TRUST_HOST: "true", AUTH_LOG_MAGIC_LINKS: "true" },
  },
});
