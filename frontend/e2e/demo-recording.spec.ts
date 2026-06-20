import { test, expect, type Locator, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Scripted demo recorder. Drives the real cockpit through its strongest moments and
// records the run as a 1920x1080 video for the pitch's solution slide. It is offline
// and deterministic: a fresh context seeds the same seven cases into localStorage, so
// Helvetia is HIGH every take. The expect() calls double as a smoke test, a failure
// here means an impressive section stopped rendering. Run via: npm run record:demo
// (see playwright.demo.config.ts). Tune pace with $env:SPEED and passes with $env:LOOPS.

// We record ONE clean pass (LOOPS=1) and build the loop in post (finalize-demo.mjs):
// no in-browser reset means no white reload flash mid-video, and it drops a second
// compile plus hydration so the run is faster. The opening browser load (the pulsing
// DRIFTWATCH loader plus hydration) is cut by the head-trim, the spec measures where to
// cut and writes it to demo-out/trim.json; ffmpeg then trims there and concatenates the
// clean pass DEMO_LOOPS times. SPEED scales the holds; lower it for a more readable take.
const SPEED = Number(process.env.SPEED) || 3.2;
const LOOPS = Number(process.env.LOOPS) || 1;

// A visible gold cursor that follows the mouse, so glides read on camera. Injected
// after the app has hydrated (not via addInitScript) to avoid disturbing hydration;
// idempotent, so calling it once per pass is safe.
const INSTALL_CURSOR = `
  (() => {
    if (document.getElementById('dw-demo-cursor')) return;
    const dot = document.createElement('div');
    dot.id = 'dw-demo-cursor';
    dot.style.cssText = [
      'position:fixed','top:0','left:0','width:22px','height:22px',
      'border-radius:50%','background:rgba(216,166,70,.92)',
      'box-shadow:0 0 0 3px rgba(216,166,70,.30)',
      'pointer-events:none','z-index:2147483647',
      'transform:translate(-50%,-50%)','transition:transform .05s linear',
    ].join(';');
    document.documentElement.appendChild(dot);
    document.addEventListener('mousemove', (e) => {
      dot.style.left = e.clientX + 'px';
      dot.style.top = e.clientY + 'px';
    }, true);
    document.addEventListener('mousedown', () => { dot.style.transform = 'translate(-50%,-50%) scale(.7)'; }, true);
    document.addEventListener('mouseup', () => { dot.style.transform = 'translate(-50%,-50%) scale(1)'; }, true);
  })();
`;

// Pause on a money moment so the eye can land. Base ms scaled by SPEED.
const beat = (page: Page, ms: number) => page.waitForTimeout(ms / SPEED);

// Where the cursor currently is. We track it ourselves so each move can start from the
// last point and trace a continuous, hand-guided path (Playwright has no "current pos").
let cursor = { x: 960, y: 160 };

// Move the cursor like a hand would: along a gently curved, eased path with sub-pixel
// jitter, instead of a straight teleport. The arc bows perpendicular to the travel
// direction, the easing slows the ends, and a tiny per-step pause gives it real motion.
async function humanMove(page: Page, x: number, y: number) {
  const start = { ...cursor };
  const dx = x - start.x;
  const dy = y - start.y;
  const dist = Math.hypot(dx, dy) || 1;
  const steps = Math.max(18, Math.min(40, Math.round(dist / 18)));
  // Control point: midpoint pushed sideways for a soft arc, side chosen per move.
  const mx = (start.x + x) / 2;
  const my = (start.y + y) / 2;
  const arc = Math.min(60, dist * 0.12) * (Math.random() < 0.5 ? -1 : 1);
  const cx = mx + (-dy / dist) * arc;
  const cy = my + (dx / dist) * arc;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // easeInOutQuad
    const u = 1 - e;
    const px = u * u * start.x + 2 * u * e * cx + e * e * x;
    const py = u * u * start.y + 2 * u * e * cy + e * e * y;
    const jx = (Math.random() - 0.5) * 0.6;
    const jy = (Math.random() - 0.5) * 0.6;
    await page.mouse.move(px + jx, py + jy);
    await page.waitForTimeout(7 / SPEED);
  }
  await page.mouse.move(x, y);
  cursor = { x, y };
}

// Glide the cursor to an element, then click it reliably. The glide is the on-camera
// motion; the locator click guarantees the React handler fires even if layout shifts.
async function glideClick(page: Page, locator: Locator) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (box) {
    await humanMove(page, box.x + box.width / 2, box.y + box.height / 2);
    await beat(page, 140);
  }
  await locator.click();
}

// Reveal a section and let it settle (bars animate via .dw-bar on enter).
async function reveal(page: Page, locator: Locator, hold: number) {
  await locator.scrollIntoViewIfNeeded();
  await beat(page, hold);
}

// Prove a click changes the UI: snapshot a signal before, assert it differs after. This
// catches dead clicks, like re-selecting the case already open or re-picking the active
// recipient, so the demo never films a click that does nothing.
async function clickExpectChange(page: Page, locator: Locator, signal: () => Promise<string>) {
  const before = await signal();
  await glideClick(page, locator);
  await expect.poll(signal, { timeout: 4000 }).not.toBe(before);
}

test("demo recording: full sweep, looped", async ({ page }) => {
  // Captured as close to recording start as we can get; readyMs below is measured from here
  // so finalize-demo.mjs knows where to trim the opening browser load out of the video.
  const t0 = Date.now();

  // Change signals for clickExpectChange. bodyText covers navigation and case swaps (login
  // <-> app, case A -> case B, the decision banner, the sent bubble, the COST navigation all
  // change the page text); placeholderText covers the recipient toggle, where the active pill
  // and the draft placeholder change but the body text does not.
  const bodyText = () => page.locator("body").innerText();
  const placeholderText = async () => (await page.locator("textarea").getAttribute("placeholder")) ?? "";

  for (let pass = 0; pass < LOOPS; pass++) {
    if (pass > 0) {
      // Reset to a clean seed so every pass replays from the seat picker identically.
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
    }

    // 1) Open: the seat picker, three lines of defence.
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Select your role/ })).toBeVisible();
    if (pass === 0) {
      // The seat picker is now painted; everything before this is the load we trim away.
      // A 250ms margin pushes the cut just past the loader (covers the gap between recording
      // start and t0); the fixed ~1s hold below keeps the seat picker clearly on screen.
      const startSec = Math.max(0, (Date.now() - t0 + 250) / 1000);
      const outDir = join(process.cwd(), "demo-out");
      mkdirSync(outDir, { recursive: true });
      writeFileSync(join(outDir, "trim.json"), JSON.stringify({ startSec }));
    }
    await page.evaluate(INSTALL_CURSOR);
    cursor = { x: 960, y: 160 };
    // Fixed (not SPEED-scaled) so the clip always opens on ~1s of static seat picker,
    // giving the head-trim slack regardless of SPEED.
    await page.waitForTimeout(1000);

    // 2) Take the Compliance seat; it can both open the case file and take the decision.
    await clickExpectChange(page, page.getByRole("button", { name: /Sofia Keller/ }), bodyText);
    await expect(page.getByText("Escalations · ranked")).toBeVisible();
    await beat(page, 500);

    // 3) Inbox drives the case file. The cockpit opens already landed on the top-ranked case
    //    (Castor Mining Ltd, the adverse-media escalation); open Helvetia, the HIGH-risk crypto
    //    pivot, for the narrative. One selection change, no back-and-forth. Hold on the risk delta.
    await expect(page.getByRole("heading", { name: "Castor Mining Ltd" })).toBeVisible();
    await clickExpectChange(page, page.getByRole("button", { name: /Helvetia Capital AG/ }), bodyText);
    await expect(page.getByRole("heading", { name: "Helvetia Capital AG" })).toBeVisible();
    await expect(page.getByText("HIGH RISK")).toBeVisible();
    await beat(page, 1100);

    // 4) Drift signals: the animated materiality bars.
    await reveal(page, page.getByText("DRIFT SIGNALS"), 850);

    // 5) What changed: the source-cited timeline (SaaS -> crypto OTC, new BVI shareholder).
    await reveal(page, page.getByText("WHAT CHANGED"), 950);

    // 6) The recommendation card and the decision actions.
    await reveal(page, page.getByText("RECOMMENDED").first(), 550);

    // 7) Second-line decision: require Re-KYC. The decided banner is written to the log.
    await clickExpectChange(page, page.getByRole("button", { name: /Require Re-KYC/ }), bodyText);
    await expect(page.getByText(/written to audit log/)).toBeVisible();
    await beat(page, 1100);

    // 8) Close the loop: switch to the RM seat, where the Re-KYC instruction lands back down.
    //    The RM book also opens on the top case (Castor); open Helvetia once, no back-and-forth.
    await clickExpectChange(page, page.getByRole("button", { name: "SWITCH ROLE" }), bodyText);
    await clickExpectChange(page, page.getByRole("button", { name: /Lena Brunner/ }), bodyText);
    await expect(page.getByRole("heading", { name: "Castor Mining Ltd" })).toBeVisible();
    await clickExpectChange(page, page.getByRole("button", { name: /Helvetia Capital AG/ }), bodyText);
    await expect(page.getByRole("button", { name: "Confirm Re-KYC initiated" })).toBeVisible();
    await beat(page, 900);

    // 8b) The human handoff: the first line acknowledges back up to the second line. As the RM,
    //     pick the second recipient (the Compliance manager) so the draft visibly retargets, then
    //     type and send the acknowledgement. Recorded once in the single pass.
    await reveal(page, page.getByText("CASE CONVERSATION"), 500);
    // Scope to the "To:" row so /Compliance/ matches the recipient pill, not a case row whose
    // status text also mentions compliance.
    const toRow = page.getByText("To:", { exact: true }).locator("..");
    await clickExpectChange(page, toRow.getByRole("button", { name: /Compliance/ }), placeholderText);
    const draft = page.getByPlaceholder(/Message Sofia/);
    await glideClick(page, draft);
    await draft.pressSequentially(
      "Re-KYC initiated on the crypto OTC pivot. Confirming UBO on the new BVI shareholder; will report back.",
      { delay: 16 },
    );
    await beat(page, 350);
    await clickExpectChange(page, page.getByRole("button", { name: "Send message" }), bodyText);
    await expect(page.getByText(/Confirming UBO on the new BVI shareholder/)).toBeVisible();
    await beat(page, 1000);

    // 9) Cost and efficiency: a quick glance at the tokens/metrics dashboard where the
    // staged cascade pays off (a judging criterion).
    await clickExpectChange(page, page.getByRole("link", { name: "COST" }), bodyText);
    await expect(page.getByText("COST & EFFICIENCY")).toBeVisible();
    await beat(page, 900);
  }
});
