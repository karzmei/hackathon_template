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

// FJ3 in docs/USER_JOURNEYS.md: RM hands a complex case sideways to the Account Manager.
test("@smoke RM hands Bernina over to the Account Manager", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Lena Brunner/ }).click();

  await page.getByRole("button", { name: /Bernina Wealth Partners/ }).click();
  await expect(page.getByRole("heading", { name: "Bernina Wealth Partners" })).toBeVisible();

  await page.getByRole("button", { name: /Hand over to Account Manager/ }).click();
  await expect(page.getByText("Reassigned to Account Manager").first()).toBeVisible();
  await expect(page.getByText(/Handed over to Account Manager/)).toBeVisible();
});

// FJ5 in docs/USER_JOURNEYS.md: a Compliance Re-KYC instruction returns to the 1st line and is confirmed.
test("@smoke the Re-KYC instruction returns to the RM and is confirmed", async ({ page }) => {
  await page.goto("/");

  // 2nd line decides Re-KYC on the flagged Helvetia case.
  await page.getByRole("button", { name: /Sofia Keller/ }).click();
  await page.getByRole("button", { name: /Helvetia Capital AG/ }).click();
  await page.getByRole("button", { name: /Require Re-KYC/ }).click();
  await expect(page.getByText(/written to audit log/)).toBeVisible();

  // Hand back to the 1st line and confirm the instruction.
  await page.getByRole("button", { name: "SWITCH ROLE" }).click();
  await page.getByRole("button", { name: /Lena Brunner/ }).click();
  await page.getByRole("button", { name: /Helvetia Capital AG/ }).click();

  await page.getByRole("button", { name: "Confirm Re-KYC initiated" }).click();
  await expect(page.getByText(/Confirmed Re-KYC initiated/)).toBeVisible();
});

// FJ6 in docs/USER_JOURNEYS.md: the live two-window handoff. Two pages in one browser
// context share localStorage; an RM escalation in window A propagates to the Compliance
// window B via the storage event + poll, with no reload.
test("@smoke cross-window: an RM escalation reaches the Compliance window live", async ({ browser }) => {
  const context = await browser.newContext();
  const rm = await context.newPage();
  await rm.goto("/");
  await rm.getByRole("button", { name: /Lena Brunner/ }).click();
  await expect(rm.getByText("Your book")).toBeVisible();

  const compliance = await context.newPage();
  await compliance.goto("/");
  await compliance.getByRole("button", { name: /Sofia Keller/ }).click();
  await expect(compliance.getByText("Escalations · ranked")).toBeVisible();

  // Window A: the RM escalates Castor.
  await rm.getByRole("button", { name: /Castor Mining Ltd/ }).click();
  await rm.getByRole("button", { name: /Escalate to Compliance/ }).click();
  await expect(rm.getByText("Flagged · awaiting Compliance").first()).toBeVisible();

  // Window B never escalated; the flagged status can only arrive via cross-window sync.
  await expect(compliance.getByText("Flagged · awaiting Compliance").first()).toBeVisible();

  await context.close();
});

// AM lane: the Account Manager works an owned structural case and escalates it up.
test("@smoke AM escalates an owned account to Compliance", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Marco Reuss/ }).click();
  await expect(page.getByText("Accounts you own")).toBeVisible();

  await page.getByRole("button", { name: /Nordwind Trading GmbH/ }).click();
  await expect(page.getByRole("heading", { name: "Nordwind Trading GmbH" })).toBeVisible();

  await page.getByRole("button", { name: /Escalate to Compliance/ }).click();
  await expect(page.getByText("Escalated by AM · awaiting Compliance").first()).toBeVisible();
  await expect(page.getByText(/Escalated to Compliance \(1st -> 2nd line\)/)).toBeVisible();
});

// FJ7 in docs/USER_JOURNEYS.md: a quiet client is reviewed with no change.
test("@smoke RM reviews a quiet client with no change", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Lena Brunner/ }).click();

  await page.getByRole("button", { name: /Alpenrose Family Office/ }).click();
  await expect(page.getByRole("heading", { name: "Alpenrose Family Office" })).toBeVisible();

  await page.getByRole("button", { name: /Reviewed · no change/ }).click();
  await expect(page.getByText(/Reviewed, no change/)).toBeVisible();
});

// A case message must reach its recipient: the case surfaces in their book, pulses
// unread, and the message is readable once opened. Directions are symmetric.
test("@smoke RM message to AM surfaces the case for Marco and reads", async ({ page }) => {
  const marker = "RM->AM new shareholder review needed";
  await page.goto("/");

  // Lena (RM) opens an RM-owned case and messages the Account Manager.
  await page.getByRole("button", { name: /Lena Brunner/ }).click();
  await page.getByRole("button", { name: /Castor Mining Ltd/ }).click();
  await page.getByRole("button", { name: "MR Account Manager" }).click(); // recipient pill = AM
  await page.getByRole("textbox").fill(marker);
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText(marker)).toBeVisible();

  // Marco (AM) takes the seat; the RM-owned case now appears in his book, unread.
  await page.getByRole("button", { name: "SWITCH ROLE" }).click();
  await page.getByRole("button", { name: /Marco Reuss/ }).click();
  const row = page.getByRole("button", { name: /Castor Mining Ltd/ });
  await expect(row).toBeVisible();
  await expect(row.getByLabel("unread")).toBeVisible();

  // Opening it shows the message and clears the unread dot.
  await row.click();
  await expect(page.getByRole("heading", { name: "Castor Mining Ltd" })).toBeVisible();
  await expect(page.getByText(marker)).toBeVisible();
  await expect(row.getByLabel("unread")).toHaveCount(0);
});

test("@smoke AM message to RM surfaces the case for Lena and reads", async ({ page }) => {
  const marker = "AM->RM your call on this account";
  await page.goto("/");

  // Marco (AM) opens an AM-owned case and messages the Relationship Manager.
  await page.getByRole("button", { name: /Marco Reuss/ }).click();
  await page.getByRole("button", { name: /Nordwind Trading GmbH/ }).click();
  await page.getByRole("button", { name: "LB Relationship Manager" }).click(); // recipient pill = RM
  await page.getByRole("textbox").fill(marker);
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText(marker)).toBeVisible();

  // Lena (RM) takes the seat; the AM-owned case now appears in her book, unread.
  await page.getByRole("button", { name: "SWITCH ROLE" }).click();
  await page.getByRole("button", { name: /Lena Brunner/ }).click();
  const row = page.getByRole("button", { name: /Nordwind Trading GmbH/ });
  await expect(row).toBeVisible();
  await expect(row.getByLabel("unread")).toBeVisible();

  await row.click();
  await expect(page.getByRole("heading", { name: "Nordwind Trading GmbH" })).toBeVisible();
  await expect(page.getByText(marker)).toBeVisible();
  await expect(row.getByLabel("unread")).toHaveCount(0);
});
