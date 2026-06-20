import { describe, it, expect } from "vitest";
import { seedCases } from "@/lib/cockpit-seed";
import type { Case } from "@/lib/cockpit-types";

function byId(cases: Case[], id: string): Case {
  const c = cases.find((x) => x.id === id);
  if (!c) throw new Error(`no seed case ${id}`);
  return c;
}

describe("seedCases", () => {
  const cases = seedCases();

  it("seeds the seven cockpit cases with unique ids", () => {
    const ids = cases.map((c) => c.id);
    expect(ids).toEqual(["helvetia", "bernina", "castor", "nordwind", "lago", "alpenrose", "meridian"]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("splits ownership across the two first-line seats", () => {
    expect(cases.filter((c) => c.owner === "rm").map((c) => c.id)).toEqual([
      "helvetia",
      "bernina",
      "castor",
      "alpenrose",
      "meridian",
    ]);
    expect(cases.filter((c) => c.owner === "am").map((c) => c.id)).toEqual(["nordwind", "lago"]);
  });

  it("seeds Helvetia as the flagged HIGH-band escalation", () => {
    const h = byId(cases, "helvetia");
    expect(h.band).toBe("HIGH");
    expect(h.prevBand).toBe("MEDIUM");
    expect(h.status).toBe("flagged_by_rm");
    expect(h.unread).toBe(true);
    expect(h.materiality).toBe(92);
    expect(h.compRec).toBe("re_kyc");
  });

  it("seeds the two quiet monitor cases with empty audit and messages", () => {
    for (const id of ["alpenrose", "meridian"]) {
      const c = byId(cases, id);
      expect(c.quiet).toBe(true);
      expect(c.recAction).toBe("monitor");
      expect(c.audit).toEqual([]);
      expect(c.messages).toEqual([]);
    }
  });

  it("only recommends no action on quiet LOW-band cases", () => {
    // Guards the contradictory state of a HIGH/MEDIUM-risk case telling the user
    // to take no action; a "monitor" recommendation must be a genuinely quiet case.
    for (const c of cases) {
      if (c.recAction === "monitor") {
        expect(c.band).toBe("LOW");
        expect(c.quiet).toBe(true);
      }
    }
  });

  it("gives every case a well-formed shape", () => {
    for (const c of cases) {
      expect(c.client.length).toBeGreaterThan(0);
      expect(c.lei.length).toBeGreaterThan(0);
      expect(["LOW", "MEDIUM", "HIGH"]).toContain(c.band);
      expect(c.signals.length).toBeGreaterThan(0);
      expect(c.changes.length).toBeGreaterThan(0);
      expect(c.facts.length).toBeGreaterThan(0);
      for (const s of c.signals) expect(typeof s.pts).toBe("number");
      for (const ch of c.changes) expect(["negative", "positive", "neutral"]).toContain(ch.dir);
    }
  });

  it("is deterministic but returns independent objects each call", () => {
    const a = seedCases();
    const b = seedCases();
    expect(a).toEqual(b); // deep-equal: same seed every time
    expect(a).not.toBe(b); // fresh array
    expect(a[0]).not.toBe(b[0]); // fresh case objects, safe to mutate
  });
});
