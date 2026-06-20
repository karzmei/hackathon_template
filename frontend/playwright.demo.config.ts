import { defineConfig } from "@playwright/test";
import { baseURL, webServer } from "./e2e/server";

// Dedicated config for the scripted demo recorder. It records a 1920x1080 video of the
// single narrative spec into demo-out/, reusing the same self-booting dev server as the
// e2e suite (frontend-only, no backend, no LLM key). Kept separate from playwright.config.ts
// so the recording run is isolated and the output path is predictable.

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/demo-recording.spec.ts",
  outputDir: "demo-out",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 180_000,
  // Generous, the first take compiles the dev route cold before the seat picker paints.
  expect: { timeout: 15_000 },
  reporter: "list",
  use: {
    baseURL,
    viewport: { width: 1920, height: 1080 },
    video: { mode: "on", size: { width: 1920, height: 1080 } },
  },
  webServer,
});
