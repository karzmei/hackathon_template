import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useCockpit } from "@/lib/use-cockpit";
import { seedCases } from "@/lib/cockpit-seed";
import type { Case } from "@/lib/cockpit-types";

const CASES_KEY = "dw_p1_cases_v2";
const ROLE_KEY = "dw_p1_role";

function storedCases(): Case[] {
  return JSON.parse(localStorage.getItem(CASES_KEY) || "[]") as Case[];
}

function caseById(cases: Case[], id: string): Case {
  const c = cases.find((x) => x.id === id);
  if (!c) throw new Error(`no case ${id}`);
  return c;
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useCockpit lifecycle", () => {
  it("seeds the case book into localStorage on first mount", () => {
    const { result } = renderHook(() => useCockpit());
    expect(result.current.ready).toBe(true);
    expect(result.current.cases).toHaveLength(seedCases().length);
    expect(storedCases()).toHaveLength(seedCases().length);
  });

  it("pick stores the role in sessionStorage and defaults the recipient", () => {
    const { result } = renderHook(() => useCockpit());
    act(() => result.current.pick("rm"));
    expect(result.current.role).toBe("rm");
    expect(result.current.msgTo).toBe("am");
    expect(sessionStorage.getItem(ROLE_KEY)).toBe("rm");
  });

  it("logout clears the role", () => {
    const { result } = renderHook(() => useCockpit());
    act(() => result.current.pick("compliance"));
    act(() => result.current.logout());
    expect(result.current.role).toBeNull();
    expect(sessionStorage.getItem(ROLE_KEY)).toBeNull();
  });
});

describe("useCockpit actions persist and audit", () => {
  it("escalateCompliance flags the case and appends an audit entry", () => {
    const { result } = renderHook(() => useCockpit());
    act(() => result.current.pick("rm"));
    act(() => result.current.select("castor"));
    const before = caseById(result.current.cases, "castor").audit.length;
    act(() => result.current.escalateCompliance());
    const after = caseById(storedCases(), "castor");
    expect(after.status).toBe("flagged_by_rm");
    expect(after.unread).toBe(true);
    expect(after.audit.length).toBe(before + 1);
    expect(after.audit.at(-1)?.action).toMatch(/Escalated to Compliance/);
  });

  it("compliance opening a flagged case moves it into review", () => {
    const { result } = renderHook(() => useCockpit());
    act(() => result.current.pick("compliance"));
    act(() => result.current.select("helvetia")); // seeded as flagged_by_rm
    const c = caseById(storedCases(), "helvetia");
    expect(c.status).toBe("in_compliance_review");
    expect(c.unread).toBe(false);
  });

  it("decide records the Compliance decision", () => {
    const { result } = renderHook(() => useCockpit());
    act(() => result.current.pick("compliance"));
    act(() => result.current.select("helvetia"));
    act(() => result.current.decide("re_kyc"));
    const c = caseById(storedCases(), "helvetia");
    expect(c.status).toBe("decided");
    expect(c.decision).toBe("re_kyc");
    expect(c.audit.at(-1)?.action).toMatch(/Required Re-KYC/);
  });

  it("confirmInstruction marks the instruction done for the owner", () => {
    const { result } = renderHook(() => useCockpit());
    act(() => result.current.pick("compliance"));
    act(() => result.current.select("helvetia"));
    act(() => result.current.decide("re_kyc"));
    act(() => result.current.logout());
    act(() => result.current.pick("rm"));
    act(() => result.current.select("helvetia"));
    act(() => result.current.confirmInstruction());
    expect(caseById(storedCases(), "helvetia").instructionDone).toBe(true);
  });

  it("handover reassigns the case to the AM", () => {
    const { result } = renderHook(() => useCockpit());
    act(() => result.current.pick("rm"));
    act(() => result.current.select("bernina"));
    act(() => result.current.handover());
    const c = caseById(storedCases(), "bernina");
    expect(c.owner).toBe("am");
    expect(c.status).toBe("handed_to_am");
    expect(c.amUnread).toBe(true);
  });

  it("handback returns an AM-owned case to the RM (FJ3 reverse)", () => {
    const { result } = renderHook(() => useCockpit());
    act(() => result.current.pick("am"));
    act(() => result.current.select("nordwind")); // seeded owner: am
    const before = caseById(result.current.cases, "nordwind").audit.length;
    act(() => result.current.handback());
    const c = caseById(storedCases(), "nordwind");
    expect(c.owner).toBe("rm");
    expect(c.status).toBe("open");
    expect(c.audit.length).toBe(before + 1);
    expect(c.audit.at(-1)?.action).toMatch(/Handed back to Relationship Manager/);
  });

  it("markReviewed closes a quiet case with no change (FJ7)", () => {
    const { result } = renderHook(() => useCockpit());
    act(() => result.current.pick("rm"));
    act(() => result.current.select("alpenrose")); // seeded quiet, owner: rm
    const before = caseById(result.current.cases, "alpenrose").audit.length;
    act(() => result.current.markReviewed());
    const c = caseById(storedCases(), "alpenrose");
    expect(c.status).toBe("reviewed");
    expect(c.audit.length).toBe(before + 1);
    expect(c.audit.at(-1)?.action).toMatch(/Reviewed, no change/);
  });

  it("sendMsg appends a message to the case thread", () => {
    const { result } = renderHook(() => useCockpit());
    act(() => result.current.pick("rm"));
    act(() => result.current.select("bernina"));
    act(() => result.current.setMsgDraft("Please take this one."));
    act(() => result.current.sendMsg());
    const msgs = caseById(storedCases(), "bernina").messages;
    expect(msgs.at(-1)).toMatchObject({ from: "rm", to: "am", text: "Please take this one." });
    expect(result.current.msgDraft).toBe(""); // draft cleared after send
  });

  it("ignores an empty message", () => {
    const { result } = renderHook(() => useCockpit());
    act(() => result.current.pick("rm"));
    act(() => result.current.select("bernina"));
    const before = caseById(result.current.cases, "bernina").messages.length;
    act(() => result.current.setMsgDraft("   "));
    act(() => result.current.sendMsg());
    expect(caseById(storedCases(), "bernina").messages.length).toBe(before);
  });
});

describe("useCockpit cross-window sync", () => {
  it("picks up an external localStorage change via the storage event", () => {
    const { result } = renderHook(() => useCockpit());
    act(() => result.current.pick("rm"));

    // Simulate another window watch-listing Castor and writing the shared key.
    const external = seedCases().map((c) =>
      c.id === "castor" ? { ...c, status: "decided" as const, decision: "watchlist" as const } : c,
    );
    act(() => {
      localStorage.setItem(CASES_KEY, JSON.stringify(external));
      window.dispatchEvent(new StorageEvent("storage", { key: CASES_KEY }));
    });

    expect(caseById(result.current.cases, "castor").decision).toBe("watchlist");
  });
});
