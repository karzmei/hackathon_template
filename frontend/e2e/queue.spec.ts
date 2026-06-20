import { test, expect } from "@playwright/test";

// The cockpit vertical slice on one screen (mock data): run the pipeline, read the
// pre-opened drifting client, switch clients, and record an analyst decision.
test("@smoke run pipeline, review Helvetia, approve re-KYC", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Run pipeline" }).click();

  // The queue rail lists the drifting clients; Helvetia opens by default.
  await expect(page.getByRole("button", { name: /Helvetia SaaS GmbH/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Lakeside Pharma AG/ })).toBeVisible();

  // Detail pane: risk band first, then the dimension drift and the cited timeline.
  await expect(page.getByRole("heading", { name: "Helvetia SaaS GmbH" })).toBeVisible();
  await expect(page.getByText(/AGGREGATE DRIFT/)).toBeVisible();
  await expect(page.getByText(/DRIFT BY DIMENSION/)).toBeVisible();
  await expect(page.getByText("Crypto OTC trading desk").first()).toBeVisible();
  await expect(page.getByText("SOURCE-CITED TIMELINE")).toBeVisible();

  // Switch to another client and back to confirm the rail drives the detail.
  await page.getByRole("button", { name: /Meridian Capital AG/ }).click();
  await expect(page.getByRole("heading", { name: "Meridian Capital AG" })).toBeVisible();
  await page.getByRole("button", { name: /Helvetia SaaS GmbH/ }).click();
  await expect(page.getByRole("heading", { name: "Helvetia SaaS GmbH" })).toBeVisible();

  // Human-in-the-loop: approve re-KYC, status flips and the audit trail grows.
  await page.getByRole("button", { name: "Approve Re-KYC" }).click();
  await expect(page.getByText("Actioned", { exact: true })).toBeVisible();
  await expect(page.getByText(/decision by analyst/)).toBeVisible();
});
