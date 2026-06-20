import { describe, it, expect } from "vitest";
import { seedCases } from "@/lib/cockpit-seed";
import { bandToneName, buildView, navItem, statusPill, recVM, rowVM } from "@/lib/cockpit-view";
import { TONES } from "@/lib/cockpit-types";
import { find, decided, flagged, emptied } from "@/test/cockpit-helpers";

describe("bandToneName", () => {
  it("maps each risk band to its semantic tone", () => {
    expect(bandToneName("LOW")).toBe("success");
    expect(bandToneName("MEDIUM")).toBe("warning");
    expect(bandToneName("HIGH")).toBe("danger");
  });
});

describe("statusPill", () => {
  it("labels a flagged case as awaiting Compliance", () => {
    expect(statusPill(find("helvetia")).text).toBe("Flagged · awaiting Compliance");
  });

  it("labels a quiet case as no change overnight", () => {
    expect(statusPill(find("alpenrose")).text).toBe("No change overnight");
  });

  it("labels a plain open non-quiet case as needs review", () => {
    expect(statusPill(find("castor")).text).toBe("Needs review");
  });

  it("labels each non-decided lifecycle status", () => {
    expect(statusPill({ ...find("helvetia"), status: "in_compliance_review" }).text).toBe("In Compliance review");
    expect(statusPill({ ...find("nordwind"), status: "escalated_by_am" }).text).toBe(
      "Escalated by AM · awaiting Compliance",
    );
    expect(statusPill({ ...find("bernina"), status: "handed_to_am" }).text).toBe("Reassigned to Account Manager");
    expect(statusPill({ ...find("alpenrose"), status: "reviewed" }).text).toBe("Reviewed · no change");
  });

  it("reflects a Re-KYC decision and whether the instruction is done", () => {
    const c = { ...find("helvetia"), status: "decided" as const, decision: "re_kyc" as const };
    expect(statusPill({ ...c, instructionDone: false }).text).toBe("Compliance: Re-KYC required");
    expect(statusPill({ ...c, instructionDone: true }).text).toBe("Re-KYC initiated");
  });

  it("reflects a document-request decision and its done state", () => {
    const c = { ...find("nordwind"), status: "decided" as const, decision: "doc_request" as const };
    expect(statusPill({ ...c, instructionDone: false }).text).toBe("Compliance: document requested");
    expect(statusPill({ ...c, instructionDone: true }).text).toBe("Document provided");
  });

  it("labels the remaining Compliance decisions with their tones", () => {
    const base = { ...find("castor"), status: "decided" as const };
    const watch = statusPill({ ...base, decision: "watchlist" });
    expect(watch.text).toBe("Compliance: Watchlisted");
    expect(watch.border).toBe(TONES.danger.border);

    const mlro = statusPill({ ...base, decision: "mlro" });
    expect(mlro.text).toBe("Compliance: Escalated to MLRO");
    expect(mlro.border).toBe(TONES.info.border);

    const dismiss = statusPill({ ...base, decision: "dismiss" });
    expect(dismiss.text).toBe("Compliance: cleared, no action");
    expect(dismiss.border).toBe(TONES.success.border);
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

  it("has no card when there is no recommended action", () => {
    expect(recVM({ ...find("helvetia"), recAction: null as never }).has).toBe(false);
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

  it("never marks an RM row unread", () => {
    expect(rowVM({ ...find("helvetia"), unread: true }, null, "rm").unread).toBe(false);
  });

  it("flags the selected row", () => {
    expect(rowVM(find("helvetia"), "helvetia", "rm").selected).toBe(true);
    expect(rowVM(find("helvetia"), "bernina", "rm").selected).toBe(false);
  });

  it("carries the band label and accent for the row", () => {
    const row = rowVM(find("helvetia"), null, "rm");
    expect(row.bandLabel).toBe("HIGH");
    expect(row.accent).toBe(TONES.danger.border);
  });
});

describe("navItem", () => {
  it("hides the count when showCount is false", () => {
    const item = navItem("Morning digest", 0, false);
    expect(item.hasCount).toBe(false);
  });

  it("applies the count tone colours when given", () => {
    const item = navItem("Inbox", 3, true, "danger");
    expect(item.hasCount).toBe(true);
    expect(item.countBg).toBe(TONES.danger.bg);
    expect(item.countColor).toBe(TONES.danger.text);
  });

  it("falls back to the dark count chip without a tone", () => {
    const item = navItem("My clients", 5, true);
    expect(item.countBg).toBe("oklch(0.205 0 0)");
    expect(item.countColor).toBe("#fff");
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

  it("RM header and empty text describe the morning digest", () => {
    const view = buildView({ role: "rm", cases, selectedId: null, msgTo: "am" });
    expect(view.listTitle).toBe("Your book");
    expect(buildView({ role: "rm", cases: [], selectedId: null, msgTo: "am" }).listEmptyText).toBe(
      "No clients in your book.",
    );
  });

  it("AM list shows only AM-owned accounts, ranked by materiality", () => {
    const view = buildView({ role: "am", cases, selectedId: null, msgTo: "rm" });
    expect(view.list.map((r) => r.id)).toEqual(["nordwind", "lago"]);
  });

  it("AM nav counts handed-to-me and escalated-by-me", () => {
    const book = [
      ...seedCases().map((c) => (c.id === "nordwind" ? { ...c, status: "handed_to_am" as const } : c)),
    ].map((c) => (c.id === "lago" ? { ...c, status: "escalated_by_am" as const } : c));
    const view = buildView({ role: "am", cases: book, selectedId: null, msgTo: "rm" });
    expect(view.nav.find((n) => n.label === "Handed to me")?.count).toBe(1);
    expect(view.nav.find((n) => n.label === "Escalated by me")?.count).toBe(1);
  });

  it("RM nav counts escalations and outstanding Compliance instructions", () => {
    const book = decided("helvetia", "re_kyc").map((c) =>
      c.id === "castor" ? { ...c, status: "flagged_by_rm" as const } : c,
    );
    const view = buildView({ role: "rm", cases: book, selectedId: null, msgTo: "am" });
    expect(view.nav.find((n) => n.label === "Escalated by me")?.count).toBe(1); // castor flagged
    expect(view.nav.find((n) => n.label === "Compliance requests")?.count).toBe(1); // helvetia re_kyc undone
  });

  it("Compliance inbox excludes low-materiality open cases and orders decided last", () => {
    const book = decided("lago", "dismiss");
    const view = buildView({ role: "compliance", cases: book, selectedId: null, msgTo: "rm" });
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
        c.status === "in_compliance_review" ||
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

  it("colours change dots by direction", () => {
    const view = buildView({ role: "rm", cases, selectedId: "helvetia", msgTo: "am" });
    const dots = view.detail?.changes.map((ch) => ch.dot) ?? [];
    expect(dots).toContain("#e24b4a"); // negative
    expect(dots).toContain("oklch(0.7 0 0)"); // neutral
  });

  it("aligns my own thread messages to the right and peers to the left", () => {
    const view = buildView({ role: "compliance", cases, selectedId: "helvetia", msgTo: "rm" });
    // Helvetia's seeded message is from rm to compliance; for compliance it is a peer.
    expect(view.detail?.thread[0].align).toBe("flex-start");
    const rmView = buildView({ role: "rm", cases, selectedId: "helvetia", msgTo: "am" });
    expect(rmView.detail?.thread[0].align).toBe("flex-end");
  });

  it("offers RM first-line actions on an open owned case", () => {
    const view = buildView({ role: "rm", cases, selectedId: "castor", msgTo: "am" });
    const keys = view.detail?.actorButtons.map((b) => b.key);
    expect(keys).toEqual(["escalate", "handover", "reviewed"]);
  });

  it("offers AM first-line actions with a hand-back on an owned case", () => {
    const view = buildView({ role: "am", cases, selectedId: "nordwind", msgTo: "rm" });
    const keys = view.detail?.actorButtons.map((b) => b.key);
    expect(keys).toEqual(["escalate", "handback", "reviewed"]);
  });

  it("offers the five Compliance decisions on an undecided case", () => {
    const view = buildView({ role: "compliance", cases: flagged("helvetia"), selectedId: "helvetia", msgTo: "rm" });
    const keys = view.detail?.actorButtons.map((b) => b.key);
    expect(keys).toEqual(["re_kyc", "doc_request", "watchlist", "mlro", "dismiss"]);
  });

  it("offers no actor buttons on a decided case", () => {
    const view = buildView({
      role: "compliance",
      cases: decided("helvetia", "watchlist"),
      selectedId: "helvetia",
      msgTo: "rm",
    });
    expect(view.detail?.hasActorButtons).toBe(false);
  });

  it("shows the instruction banner to the owner after a Re-KYC decision, then the done state", () => {
    const pending = buildView({
      role: "rm",
      cases: decided("helvetia", "re_kyc", false),
      selectedId: "helvetia",
      msgTo: "am",
    });
    expect(pending.detail?.instructionPending).toBe(true);
    expect(pending.detail?.decidedBanner).toBe(false);

    const doneView = buildView({
      role: "rm",
      cases: decided("helvetia", "re_kyc", true),
      selectedId: "helvetia",
      msgTo: "am",
    });
    expect(doneView.detail?.instructionDone).toBe(true);
    expect(doneView.detail?.instructionPending).toBe(false);
  });

  it("shows a decided banner with the outcome to the non-owner Compliance view", () => {
    const view = buildView({
      role: "compliance",
      cases: decided("helvetia", "re_kyc"),
      selectedId: "helvetia",
      msgTo: "rm",
    });
    expect(view.detail?.decidedBanner).toBe(true);
    expect(view.detail?.instructionPending).toBe(false);
    expect(view.detail?.outcomeLabel).toBe("Re-KYC required");
  });

  it("marks the recommendation actionable for the first-line owner of an open case", () => {
    const view = buildView({ role: "rm", cases, selectedId: "castor", msgTo: "am" });
    expect(view.detail?.rec.mode).toBe("actionable");
    expect(view.detail?.rec.kicker).toBe("RECOMMENDED");
  });

  it("greys the recommendation to context once the owner has already escalated", () => {
    const view = buildView({ role: "rm", cases, selectedId: "helvetia", msgTo: "am" }); // seeded flagged
    expect(view.detail?.rec.mode).toBe("context");
    expect(view.detail?.rec.kicker).toBe("ALREADY RECOMMENDED");
    expect(view.detail?.rec.contextNote).toMatch(/No action needed from you/);
  });

  it("shows the first-line recommendation to Compliance as context, not a live action", () => {
    const view = buildView({ role: "compliance", cases: flagged("helvetia"), selectedId: "helvetia", msgTo: "rm" });
    expect(view.detail?.rec.mode).toBe("context");
    expect(view.detail?.rec.kicker).toBe("FIRST LINE RECOMMENDED");
  });

  it("never leaves a decided case showing a live recommendation", () => {
    const view = buildView({ role: "rm", cases: decided("helvetia", "re_kyc"), selectedId: "helvetia", msgTo: "am" });
    expect(view.detail?.rec.mode).toBe("context");
  });

  it("offers a next-step note while the owner waits on Compliance", () => {
    const view = buildView({ role: "rm", cases, selectedId: "helvetia", msgTo: "am" }); // seeded flagged
    expect(view.detail?.hasActorButtons).toBe(false);
    expect(view.detail?.nextStep.show).toBe(true);
    expect(view.detail?.nextStep.text).toMatch(/Awaiting their decision/);
  });

  it("suppresses the next-step note when there are buttons or a decided banner", () => {
    const withButtons = buildView({ role: "compliance", cases: flagged("helvetia"), selectedId: "helvetia", msgTo: "rm" });
    expect(withButtons.detail?.hasActorButtons).toBe(true);
    expect(withButtons.detail?.nextStep.show).toBe(false);

    const decidedView = buildView({
      role: "compliance",
      cases: decided("helvetia", "watchlist"),
      selectedId: "helvetia",
      msgTo: "rm",
    });
    expect(decidedView.detail?.decidedBanner).toBe(true);
    expect(decidedView.detail?.nextStep.show).toBe(false);
  });

  it("flags empty drift sections so the UI can show placeholders", () => {
    const empty = buildView({ role: "rm", cases: emptied("castor"), selectedId: "castor", msgTo: "am" });
    expect(empty.detail?.signalsEmpty).toBe(true);
    expect(empty.detail?.changesEmpty).toBe(true);
    expect(empty.detail?.factsEmpty).toBe(true);

    const full = buildView({ role: "rm", cases, selectedId: "castor", msgTo: "am" });
    expect(full.detail?.signalsEmpty).toBe(false);
    expect(full.detail?.changesEmpty).toBe(false);
    expect(full.detail?.factsEmpty).toBe(false);
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

  it("offers an AM the RM and Compliance, and Compliance the two first-line peers", () => {
    const am = buildView({ role: "am", cases: seedCases(), selectedId: "nordwind", msgTo: "rm" });
    expect(am.msgRecipients.map((r) => r.key)).toEqual(["rm", "compliance"]);
    const comp = buildView({ role: "compliance", cases: seedCases(), selectedId: "helvetia", msgTo: "rm" });
    expect(comp.msgRecipients.map((r) => r.key)).toEqual(["rm", "am"]);
  });

  it("counts the unread inbox across the book", () => {
    const view = buildView({ role: "compliance", cases: seedCases(), selectedId: null, msgTo: "rm" });
    expect(view.inboxCount).toBe(1); // only Helvetia is seeded unread
    expect(view.hasInboxUnread).toBe(true);
  });
});

describe("buildView surfaces messaged cases to the recipient", () => {
  // A message addressed to a role pulls the case into that role's list even when
  // the role does not own it, and pulses it unread until the recipient opens it.
  it("an RM -> AM message surfaces the RM-owned case in the AM list, unread", () => {
    const cases = seedCases().map((c) =>
      c.id === "castor" // RM-owned
        ? { ...c, messages: [{ from: "rm" as const, to: "am" as const, text: "Take a look.", ts: "20 Jun 09:00" }] }
        : c,
    );
    const view = buildView({ role: "am", cases, selectedId: null, msgTo: "rm" });
    const row = view.list.find((r) => r.id === "castor");
    expect(row).toBeDefined(); // visible despite owner === "rm"
    expect(row?.unread).toBe(true);
  });

  it("clears the unread dot once the message is marked read", () => {
    const cases = seedCases().map((c) =>
      c.id === "castor"
        ? {
            ...c,
            messages: [{ from: "rm" as const, to: "am" as const, text: "Take a look.", ts: "20 Jun 09:00", read: true }],
          }
        : c,
    );
    const row = buildView({ role: "am", cases, selectedId: null, msgTo: "rm" }).list.find((r) => r.id === "castor");
    expect(row).toBeDefined();
    expect(row?.unread).toBe(false);
  });

  it("an AM -> RM message surfaces the AM-owned case in the RM list, unread", () => {
    const cases = seedCases().map((c) =>
      c.id === "nordwind" // AM-owned
        ? { ...c, messages: [{ from: "am" as const, to: "rm" as const, text: "Your call.", ts: "20 Jun 09:00" }] }
        : c,
    );
    const row = buildView({ role: "rm", cases, selectedId: null, msgTo: "am" }).list.find((r) => r.id === "nordwind");
    expect(row).toBeDefined();
    expect(row?.unread).toBe(true);
  });

  it("does not mark the sender's own row unread", () => {
    const cases = seedCases().map((c) =>
      c.id === "castor"
        ? { ...c, messages: [{ from: "rm" as const, to: "am" as const, text: "Take a look.", ts: "20 Jun 09:00" }] }
        : c,
    );
    // Lena sent it; for the RM the case is owned anyway but must not pulse unread.
    const row = buildView({ role: "rm", cases, selectedId: null, msgTo: "am" }).list.find((r) => r.id === "castor");
    expect(row?.unread).toBe(false);
  });
});
