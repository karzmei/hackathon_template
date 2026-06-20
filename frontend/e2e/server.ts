// Shared dev-server config for the Playwright suite and the demo recorder. Both boot the same
// frontend-only Next dev server (no backend, no LLM key); keeping the boot block in one place
// means a port or command change cannot drift between the two configs.
export const isCI = !!process.env.CI;
export const baseURL = "http://localhost:3000";
export const webServer = {
  command: "npm run dev",
  url: baseURL,
  timeout: 120_000,
  reuseExistingServer: !isCI,
};
