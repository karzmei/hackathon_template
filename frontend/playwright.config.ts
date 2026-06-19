import { defineConfig, devices } from "@playwright/test";

// End-to-end config (mirrors the inc-b2c-mvp e2e setup). Boots BOTH services so the
// real vertical slice runs: the FastAPI backend (offline LLM stub, no Azure key) and
// the Next dev server. No LLM mocking is needed because the backend stub is offline.
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
  webServer: [
    {
      // Use the backend virtualenv interpreter so uvicorn + deps resolve.
      command: ".venv\\Scripts\\python.exe -m uvicorn main:app --port 8000",
      cwd: "../backend",
      url: "http://localhost:8000/api/health",
      timeout: 120_000,
      reuseExistingServer: !isCI,
    },
    {
      command: "npm run dev",
      url: "http://localhost:3000",
      timeout: 120_000,
      reuseExistingServer: !isCI,
    },
  ],
});
