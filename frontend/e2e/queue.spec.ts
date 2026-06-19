import { test, expect } from "@playwright/test";

// The real vertical slice end to end, offline: run the pipeline, open the drifting
// client, and record an analyst decision. Tagged @smoke so it runs in the fast lane.
test("@smoke run pipeline, open Helvetia, approve re-KYC", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Run pipeline" }).click();

  // Helvetia escalates to a HIGH re-KYC alert; Lakeside stays a low-cost row.
  const helvetiaRow = page.getByRole("link", { name: /Helvetia SaaS GmbH/ });
  await expect(helvetiaRow).toBeVisible();
  await expect(helvetiaRow).toContainText("HIGH");
  await expect(page.getByText("Lakeside Trading AG")).toBeVisible();

  await helvetiaRow.click();

  // Detail page: risk band first, then baseline-vs-current with the changed model.
  await expect(page.getByRole("heading", { name: "Helvetia SaaS GmbH" })).toBeVisible();
  await expect(page.getByText("Baseline vs current")).toBeVisible();
  await expect(page.getByText("Crypto OTC desk", { exact: true })).toBeVisible();
  await expect(page.getByText("Source-cited timeline")).toBeVisible();

  // Human-in-the-loop: approve re-KYC, status flips and the audit trail grows.
  await page.getByRole("button", { name: "Approve Re-KYC" }).click();
  await expect(page.getByText("Actioned")).toBeVisible();
  await expect(page.getByText(/decision by/)).toBeVisible();
});
