import { defineConfig, devices } from "@playwright/test";

// E2E tests run against a production build. DATABASE_URL must point to a
// disposable database: global setup migrates, seeds and creates a test admin.
const PORT = Number(process.env.E2E_PORT ?? 3100);
// The fake Stripe API and payment page (tests/e2e/fake-stripe.mjs).
const STRIPE_PORT = Number(process.env.E2E_STRIPE_PORT ?? 12111);
const STRIPE_WEBHOOK_SECRET = "whsec_e2e_fake_stripe";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  globalSetup: "./tests/e2e/global-setup.ts",
  // Non-regression snapshots (tests/e2e/regression) are committed next to the specs.
  // CI never writes them: a missing or different snapshot fails the run.
  snapshotPathTemplate: "{testDir}/regression/__snapshots__/{arg}{ext}",
  updateSnapshots: process.env.CI ? "none" : "missing",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "off",
    locale: "en-US",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } }],
  webServer: [
    {
      command: "node tests/e2e/fake-stripe.mjs",
      url: `http://localhost:${STRIPE_PORT}/health`,
      reuseExistingServer: !process.env.CI,
      env: { FAKE_STRIPE_PORT: String(STRIPE_PORT), APP_URL: `http://localhost:${PORT}`, STRIPE_WEBHOOK_SECRET },
    },
    {
      command: `npm run build && node tools/start-standalone.mjs`,
      url: `http://localhost:${PORT}/api/health`,
      timeout: 240_000,
      reuseExistingServer: !process.env.CI,
      // Build and server logs in the CI output, so a server that never answers can be diagnosed.
      stdout: "pipe",
      stderr: "pipe",
      env: {
        DATABASE_URL: process.env.DATABASE_URL ?? "",
        PORT: String(PORT),
        // The standalone server binds to $HOSTNAME. Docker sets it to the container id
        // (CI runs in the Playwright image), which leaves localhost unanswered.
        HOSTNAME: "0.0.0.0",
        AUTH_URL: `http://localhost:${PORT}`,
        AUTH_TRUST_HOST: "true",
        AUTH_LOG_MAGIC_LINKS: "true",
        // The sample bank is still in draft: let it enter exams in tests.
        EXAM_INCLUDE_UNPUBLISHED: "true",
        // Payments go to the fake Stripe: a dummy key, never a real one.
        STRIPE_SECRET_KEY: "sk_test_e2e_fake",
        STRIPE_WEBHOOK_SECRET,
        STRIPE_API_BASE: `http://127.0.0.1:${STRIPE_PORT}`,
      },
    },
  ],
});
