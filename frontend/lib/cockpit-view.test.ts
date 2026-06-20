import { describe, it, expect } from "vitest";
import { seedCases } from "@/lib/cockpit-seed";
import { buildView, statusPill, recVM, rowVM } from "@/lib/cockpit-view";
import type { Case } from "@/lib/cockpit-types";

function find(id: string): Case {
  const c = seedCases().find((x) => x.id === id);
  if (!c) throw new Error(`no seed case ${id}`);
  return c;
}

describe("statusPill", () => {
  it("labels a flagged case as awaiting Compliance", () => {
    expect(statusPill(find("helvetia")).text).toBe("Flagged · awaiting Compliance");
  });

  it("labels a quiet case as no change overnight", () => {
    expect(statusPill(find("alpenrose")).text).toBe("No change overnight");
  });

  it("reflects a Re-KYC decision and whether the instruction is done", () => {
    const c = { ...find("helvetia"), status: "decided" as const, decision: "re_kyc" as const };
    expect(statusPill({ ...c, instructionDone: false }).text).toBe("Compliance: Re-KYC required");
    expect(statusPill({ ...c, instructionDone: true }).text).toBe("Re-KYC initiated");
  });

  it("labels a watchlist decision with the danger tone colour", () => {
    const c = { ...find("castor"), status: "decided" as const, decision: "watchlist" as const };
    const pill = statusPill(c);
    expect(pill.text).toBe("Compliance: Watchlisted");
    expect(pill.border).toBe("#e24b4a");
  });
});

describe("recVM", () => {
  it("escalate recommendation points up to the second line", () => {
    expect(recVM(find("helvetia")).direction).toBe("1ST -> 2ND LINE");
  });

  it("handover recommendation is a first-line reassignment", () => {
    expect(recVM(find("bernina")).direction).toBe("1ST-LINE REASSIGN");
  });

  it("monitor recommendation is no action", () => {
    expect(recVM(find("alpenrose")).direction).toBe("NO ACTION");
  });
});

describe("rowVM", () => {
  it("marks a compliance row unread only when the case is unread", () => {
    expect(rowVM(find("helvetia"), null, "compliance").unread).toBe(true);
    expect(rowVM(find("bernina"), null, "compliance").unread).toBe(false);
  });

  it("marks an AM row unread from amUnread, not unread", () => {
    const c = { ...find("nordwind"), unread: true, amUnread: false };
    expect(rowVM(c, null, "am").unread).toBe(false);
    expect(rowVM({ ...c, amUnread: true }, null, "am").unread).toBe(true);
  });

  it("flags the selected row", () => {
    expect(rowVM(find("helvetia"), "helvetia", "rm").selected).toBe(true);
    expect(rowVM(find("helvetia"), "bernina", "rm").selected).toBe(false);
  });
});

describe("buildView lists and nav", () => {
  const cases = seedCases();

  it("RM book is ranked by materiality with quiet clients last", () => {
    const view = buildView({ role: "rm", cases, selectedId: null, msgTo: "am" });
    const ids = view.list.map((r) => r.id);
    // RM-owned: helvetia(92), castor(78), bernina(58), then quiet alpenrose(8)/meridian(5).
    expect(ids).toEqual(["helvetia", "castor", "bernina", "alpenrose", "meridian"]);
  });

  it("AM list shows only AM-owned accounts", () => {
    const view = buildView({ role: "am", cases, selectedId: null, msgTo: "rm" });
    expect(view.list.map((r) => r.id).sort()).toEqual(["lago", "nordwind"]);
  });

  it("Compliance inbox excludes low-materiality open cases and orders decided last", () => {
    const decided = cases.map((c) =>
      c.id === "lago" ? { ...c, status: "decided" as const, decision: "dismiss" as const } : c,
    );
    const view = buildView({ role: "compliance", cases: decided, selectedId: null, msgTo: "rm" });
    const ids = view.list.map((r) => r.id);
    expect(ids).toContain("helvetia"); // flagged
    expect(ids).not.toContain("alpenrose"); // open + materiality 8 < 40
    expect(ids[ids.length - 1]).toBe("lago"); // decided sinks to the bottom
  });

  it("Compliance nav inbox count counts undecided eligible cases", () => {
    const view = buildView({ role: "compliance", cases, selectedId: null, msgTo: "rm" });
    const inbox = view.nav.find((n) => n.label === "Inbox");
    const need = cases.filter(
      (c) =>
        c.status === "flagged_by_rm" ||
        c.status === "escalated_by_am" ||
        (c.status === "open" && c.materiality >= 40),
    ).length;
    expect(inbox?.count).toBe(need);
  });

  it("reports an empty list with its empty text", () => {
    const view = buildView({ role: "am", cases: [], selectedId: null, msgTo: "rm" });
    expect(view.listEmpty).toBe(true);
    expect(view.listEmptyText).toBe("Nothing assigned to you yet.");
  });
});

describe("buildView detail assembly", () => {
  const cases = seedCases();

  it("shows the band delta only when prevBand differs from band", () => {
    const helvetia = buildView({ role: "rm", cases, selectedId: "helvetia", msgTo: "am" });
    expect(helvetia.detail?.showDelta).toBe(true); // MEDIUM -> HIGH
    const alpenrose = buildView({ role: "rm", cases, selectedId: "alpenrose", msgTo: "am" });
    expect(alpenrose.detail?.showDelta).toBe(false); // LOW -> LOW
  });

  it("normalises signal bars so the top signal is 100%", () => {
    const view = buildView({ role: "rm", cases, selectedId: "helvetia", msgTo: "am" });
    expect(view.detail?.signals[0].pct).toBe("100%"); // 34 is the max
  });

  it("offers RM first-line actions on an open owned case", () => {
    const view = buildView({ role: "rm", cases, selectedId: "castor", msgTo: "am" });
    const keys = view.detail?.actorButtons.map((b) => b.key);
    expect(keys).toEqual(["escalate", "handover", "reviewed"]);
  });

  it("offers the five Compliance decisions on an undecided case", () => {
    const flagged = cases.map((c) => (c.id === "helvetia" ? { ...c, status: "flagged_by_rm" as const } : c));
    const view = buildView({ role: "compliance", cases: flagged, selectedId: "helvetia", msgTo: "rm" });
    const keys = view.detail?.actorButtons.map((b) => b.key);
    expect(keys).toEqual(["re_kyc", "doc_request", "watchlist", "mlro", "dismiss"]);
  });

  it("shows the instruction banner to the owner after a Re-KYC decision, then the done state", () => {
    const decided = cases.map((c) =>
      c.id === "helvetia"
        ? { ...c, status: "decided" as const, decision: "re_kyc" as const, instructionDone: false }
        : c,
    );
    const pending = buildView({ role: "rm", cases: decided, selectedId: "helvetia", msgTo: "am" });
    expect(pending.detail?.instructionPending).toBe(true);
    expect(pending.detail?.decidedBanner).toBe(false);

    const done = decided.map((c) => (c.id === "helvetia" ? { ...c, instructionDone: true } : c));
    const doneView = buildView({ role: "rm", cases: done, selectedId: "helvetia", msgTo: "am" });
    expect(doneView.detail?.instructionDone).toBe(true);
    expect(doneView.detail?.instructionPending).toBe(false);
  });

  it("shows a decided banner to the non-owner Compliance view", () => {
    const decided = cases.map((c) =>
      c.id === "helvetia" ? { ...c, status: "decided" as const, decision: "re_kyc" as const } : c,
    );
    const view = buildView({ role: "compliance", cases: decided, selectedId: "helvetia", msgTo: "rm" });
    expect(view.detail?.decidedBanner).toBe(true);
    expect(view.detail?.instructionPending).toBe(false);
  });
});

describe("buildView role gating and recipients", () => {
  it("is a login view with no role", () => {
    const view = buildView({ role: null, cases: seedCases(), selectedId: null, msgTo: null });
    expect(view.isLogin).toBe(true);
    expect(view.isApp).toBe(false);
    expect(view.detail).toBeNull();
  });

  it("offers an RM the AM and Compliance as message recipients", () => {
    const view = buildView({ role: "rm", cases: seedCases(), selectedId: "helvetia", msgTo: "am" });
    expect(view.msgRecipients.map((r) => r.key)).toEqual(["am", "compliance"]);
    expect(view.msgRecipients.find((r) => r.key === "am")?.active).toBe(true);
  });
});
