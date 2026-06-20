import { test, expect } from "@playwright/test";

// The cockpit runs the first-line -> second-line handoff in one window: pick a seat,
// read the ranked book, open a drifting client, and walk the escalate -> decide chain.
// Cross-window sync is a manual demo; here we exercise a single window end to end.

test("@smoke RM reviews the book and escalates Helvetia to Compliance", async ({ page }) => {
  await page.goto("/");

  // Seat picker: pick the Relationship Manager.
  await page.getByRole("button", { name: /Lena Brunner/ }).click();

  // The book is ranked by materiality; Helvetia and Castor are RM-owned.
  await expect(page.getByText("Your book")).toBeVisible();
  await expect(page.getByRole("button", { name: /Castor Mining Ltd/ })).toBeVisible();

  // Open Castor (open case) and read the case file: risk delta, signals, timeline.
  await page.getByRole("button", { name: /Castor Mining Ltd/ }).click();
  await expect(page.getByRole("heading", { name: "Castor Mining Ltd" })).toBeVisible();
  await expect(page.getByText("DRIFT SIGNALS")).toBeVisible();
  await expect(page.getByText("WHAT CHANGED")).toBeVisible();
  await expect(page.getByText(/Adverse media · 19 Jun/)).toBeVisible();

  // First-line move: escalate to Compliance; the status flips and the audit grows.
  await page.getByRole("button", { name: /Escalate to Compliance/ }).click();
  await expect(page.getByText("Flagged · awaiting Compliance").first()).toBeVisible();
  await expect(page.getByText(/Escalated to Compliance \(1st -> 2nd line\)/)).toBeVisible();
});

test("@smoke Compliance decides a flagged escalation", async ({ page }) => {
  await page.goto("/");

  // Pick the Compliance seat; Helvetia is seeded as flagged in the inbox.
  await page.getByRole("button", { name: /Sofia Keller/ }).click();
  await expect(page.getByText("Escalations · ranked")).toBeVisible();

  await page.getByRole("button", { name: /Helvetia Capital AG/ }).click();
  await expect(page.getByRole("heading", { name: "Helvetia Capital AG" })).toBeVisible();

  // Second-line decision: require Re-KYC; the decided banner is written to the log.
  await page.getByRole("button", { name: /Require Re-KYC/ }).click();
  await expect(page.getByText(/written to audit log/)).toBeVisible();
  await expect(page.getByText(/Required Re-KYC \(instruction to 1st line\)/)).toBeVisible();
});

test("@smoke switching role returns to the seat picker", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: /Marco Reuss/ }).click();
  await expect(page.getByText("Accounts you own")).toBeVisible();

  await page.getByRole("button", { name: "SWITCH ROLE" }).click();
  await expect(page.getByRole("heading", { name: /Who's on shift\?/ })).toBeVisible();
});
