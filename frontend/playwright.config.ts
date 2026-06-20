import { defineConfig, devices } from "@playwright/test";

// End-to-end config. The cockpit is frontend-only: it seeds a deterministic case book
// into localStorage on first load, so e2e boots only the Next dev server and needs no
// backend or LLM key. Each test gets a fresh browser context, hence a fresh seed.
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: isCI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    timeout: 120_000,
    reuseExistingServer: !isCI,
  },
});
