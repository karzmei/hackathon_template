import { defineConfig, devices } from "@playwright/test";
import { baseURL, isCI, webServer } from "./e2e/server";

// End-to-end config. The cockpit is frontend-only: it seeds a deterministic case book
// into localStorage on first load, so e2e boots only the Next dev server and needs no
// backend or LLM key. Each test gets a fresh browser context, hence a fresh seed.

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  // The demo recorder has its own config (playwright.demo.config.ts); keep it out of the suite.
  testIgnore: "**/demo-recording.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: isCI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer,
});
