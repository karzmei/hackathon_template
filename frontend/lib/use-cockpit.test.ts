import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useCockpit } from "@/lib/use-cockpit";
import { seedCases } from "@/lib/cockpit-seed";
import { decided } from "@/test/cockpit-helpers";
import type { Case } from "@/lib/cockpit-types";
import type { Alert, AlertRow } from "@/lib/api";

const CASES_KEY = "dw_p1_cases_v2";
const ROLE_KEY = "dw_p1_role";
const BASE = "http://localhost:8000";

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

  it("delivers a message to the recipient and clears its unread on open (FJ: RM -> AM)", () => {
    // Lena (RM) messages Marco (AM) on her own case; Marco must see it and the
    // unread dot must clear once he opens the case.
    const { result } = renderHook(() => useCockpit());
    act(() => result.current.pick("rm"));
    act(() => result.current.select("castor")); // RM-owned
    act(() => result.current.setMsgTo("am"));
    act(() => result.current.setMsgDraft("New shareholder, please review."));
    act(() => result.current.sendMsg());

    // Marco picks up the case (no reload; shared localStorage / state).
    act(() => result.current.logout());
    act(() => result.current.pick("am"));
    const delivered = caseById(result.current.cases, "castor").messages.at(-1);
    expect(delivered).toMatchObject({ from: "rm", to: "am", text: "New shareholder, please review." });
    expect(delivered?.read).toBeFalsy(); // unread until opened

    act(() => result.current.select("castor"));
    const afterOpen = caseById(storedCases(), "castor").messages.find((m) => m.to === "am");
    expect(afterOpen?.read).toBe(true);
  });
});

describe("useCockpit edge cases", () => {
  it("re-seeds a fresh book when stored JSON is malformed", () => {
    localStorage.setItem(CASES_KEY, "{ not valid json");
    const { result } = renderHook(() => useCockpit());
    expect(result.current.cases).toHaveLength(seedCases().length);
    expect(storedCases()).toHaveLength(seedCases().length); // valid seed written back
  });

  it("keeps the audit trail append-only across successive actions", () => {
    const { result } = renderHook(() => useCockpit());
    act(() => result.current.pick("compliance"));
    const original = caseById(result.current.cases, "helvetia").audit[0];
    act(() => result.current.select("helvetia")); // opening a flagged case logs an entry
    const afterOpen = caseById(storedCases(), "helvetia").audit.length;
    act(() => result.current.decide("re_kyc")); // a second entry
    const after = caseById(storedCases(), "helvetia").audit;
    expect(after.length).toBeGreaterThan(afterOpen);
    expect(after[0]).toEqual(original); // earliest entry never mutated
  });

  it("resets the message draft when a different case is opened", () => {
    const { result } = renderHook(() => useCockpit());
    act(() => result.current.pick("rm"));
    act(() => result.current.select("bernina"));
    act(() => result.current.setMsgDraft("draft text"));
    act(() => result.current.select("castor"));
    expect(result.current.msgDraft).toBe("");
  });

  it("setMsgTo overrides the default recipient", () => {
    const { result } = renderHook(() => useCockpit());
    act(() => result.current.pick("rm"));
    expect(result.current.msgTo).toBe("am");
    act(() => result.current.setMsgTo("compliance"));
    expect(result.current.msgTo).toBe("compliance");
  });
});

describe("useCockpit cross-window sync", () => {
  it("picks up an external localStorage change via the storage event", () => {
    const { result } = renderHook(() => useCockpit());
    act(() => result.current.pick("rm"));

    // Simulate another window watch-listing Castor and writing the shared key.
    const external = decided("castor", "watchlist");
    act(() => {
      localStorage.setItem(CASES_KEY, JSON.stringify(external));
      window.dispatchEvent(new StorageEvent("storage", { key: CASES_KEY }));
    });

    expect(caseById(result.current.cases, "castor").decision).toBe("watchlist");
  });

  it("picks up an external change on the next poll tick without a storage event", () => {
    const { result } = renderHook(() => useCockpit());
    act(() => result.current.pick("compliance"));

    const external = decided("lago", "dismiss");
    act(() => {
      localStorage.setItem(CASES_KEY, JSON.stringify(external));
    });
    // No storage event in this tab; the 1100ms poll reconciles the shared key.
    act(() => vi.advanceTimersByTime(1100));

    expect(caseById(result.current.cases, "lago").decision).toBe("dismiss");
  });
});

// Live backend mode (NEXT_PUBLIC_USE_BACKEND=true). The flag is read once at module
// load, so each test stubs the env, resets the module registry, and dynamically
// imports a fresh useCockpit. fetch is stubbed (no real backend); real timers let the
// async hydration promises settle.
describe("useCockpit live backend mode", () => {
  function okJson(payload: unknown): Response {
    return { ok: true, status: 200, statusText: "OK", json: async () => payload } as Response;
  }

  function liveRow(): AlertRow {
    return {
      id: "helvetia",
      client_name: "Helvetia SaaS GmbH",
      risk_band: "LOW -> HIGH",
      top_change: "Crypto pivot",
      status: "needs_review",
      recommended_action: "escalate",
      analysis_depth: 3,
      cost: { tokens_in: 1, tokens_out: 1, usd: 0.01 },
      created_at: "2026-06-20T08:00:00Z",
    };
  }

  function liveAlert(): Alert {
    return {
      ...liveRow(),
      client_id: "helvetia",
      implies: "Material KYC change",
      drift_score: {
        client_id: "helvetia",
        aggregate: 0.85,
        band: "high",
        confidence: 0.8,
        invalidated_assumptions: [],
        per_dimension: [],
      },
      signals: [],
      baseline: {
        client_id: "helvetia",
        business_model: "B2B SaaS",
        expected_activity: "",
        expected_volume_band: "low",
        owners: [],
        legal_form: "GmbH",
        domain: "helvetia-saas.ch",
        risk_rating: "LOW",
      },
      current: {
        client_id: "helvetia",
        business_model: "Crypto OTC desk",
        expected_activity: "",
        expected_volume_band: "high",
        owners: [],
        legal_form: "AG",
        domain: "helvetia-otc.io",
        risk_rating: "HIGH",
      },
      audit: [],
    };
  }

  let fetchMock: ReturnType<typeof vi.fn>;

  // Resolve fetch by URL/method so list, run, detail, and decision all answer.
  function routeFetch(): void {
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      const u = String(url);
      if (u.endsWith("/api/alerts")) return okJson([liveRow()]);
      if (u.endsWith("/api/run")) return okJson({ alerts: [liveRow()] });
      if (u.endsWith("/decision") && init?.method === "POST") return okJson(liveAlert());
      if (u.includes("/api/alerts/")) return okJson(liveAlert());
      return okJson({});
    });
  }

  const flush = () => new Promise((r) => setTimeout(r, 0));

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.useRealTimers(); // the global beforeEach set fake timers; the async hydration needs real ones
    vi.stubEnv("NEXT_PUBLIC_USE_BACKEND", "true");
    vi.resetModules();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  async function mountLive() {
    const mod = await import("@/lib/use-cockpit");
    return renderHook(() => mod.useCockpit());
  }

  it("hydrates cases from the backend on mount", async () => {
    routeFetch();
    let result!: Awaited<ReturnType<typeof mountLive>>["result"];
    await act(async () => {
      ({ result } = await mountLive());
      await flush();
    });
    expect(result.current.cases.map((c) => c.id)).toEqual(["helvetia"]);
    expect(caseById(result.current.cases, "helvetia").client).toBe("Helvetia SaaS GmbH");
    expect(caseById(result.current.cases, "helvetia").band).toBe("HIGH");
    expect(fetchMock).toHaveBeenCalledWith(`${BASE}/api/alerts`, expect.anything());
  });

  it("decide posts the mapped backend action and still updates local state", async () => {
    routeFetch();
    let result!: Awaited<ReturnType<typeof mountLive>>["result"];
    await act(async () => {
      ({ result } = await mountLive());
      await flush();
    });
    act(() => result.current.pick("compliance"));
    act(() => result.current.select("helvetia"));
    await act(async () => {
      result.current.decide("watchlist"); // cockpit watchlist -> backend escalate
      await flush();
    });
    const decisionCall = fetchMock.mock.calls.find(([u]) =>
      String(u).endsWith("/api/alerts/helvetia/decision"),
    );
    expect(decisionCall).toBeTruthy();
    expect(JSON.parse(decisionCall![1].body as string)).toMatchObject({ action: "escalate" });
    expect(caseById(storedCases(), "helvetia").decision).toBe("watchlist");
    expect(caseById(storedCases(), "helvetia").status).toBe("decided");
  });

  it("falls back to the local seed when the backend is unreachable", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));
    let result!: Awaited<ReturnType<typeof mountLive>>["result"];
    await act(async () => {
      ({ result } = await mountLive());
      await flush();
    });
    expect(result.current.cases).toHaveLength(seedCases().length);
  });
});
