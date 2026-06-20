import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the underlying API client so we control success vs failure deterministically.
vi.mock("@/lib/api", () => ({
  api: {
    listAlerts: vi.fn(),
    getAlert: vi.fn(),
    costToday: vi.fn(),
    runPipeline: vi.fn(),
    decide: vi.fn(),
  },
}));

import { api } from "@/lib/api";
import {
  loadAlertRows,
  loadAlert,
  loadCostToday,
  decide,
  __resetMockStore,
} from "./data";
import { makeAlertRow } from "@/test/fixtures";

beforeEach(() => {
  vi.clearAllMocks();
  __resetMockStore();
  // Default to "backend down" so the fallback path is exercised; success tests opt in.
  const offline = () => Promise.reject(new Error("offline"));
  vi.mocked(api.listAlerts).mockImplementation(offline);
  vi.mocked(api.getAlert).mockImplementation(offline);
  vi.mocked(api.costToday).mockImplementation(offline);
  vi.mocked(api.runPipeline).mockImplementation(offline);
  vi.mocked(api.decide).mockImplementation(offline);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("data layer (mock-first API fallback)", () => {
  it("returns live API data when the call succeeds", async () => {
    const live = [makeAlertRow({ id: "alert-live", client_name: "Live Co" })];
    vi.mocked(api.listAlerts).mockResolvedValue(live);

    expect(await loadAlertRows()).toEqual(live);
    expect(api.listAlerts).toHaveBeenCalledTimes(1);
  });

  it("falls back to the mock dataset when the API rejects", async () => {
    vi.mocked(api.listAlerts).mockRejectedValue(new Error("network down"));

    const rows = await loadAlertRows();
    expect(rows).toHaveLength(6);
    expect(rows.map((r) => r.client_name)).toContain("Helvetia SaaS GmbH");
  });

  it("skips the network entirely when NEXT_PUBLIC_USE_MOCK is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "1");

    const cost = await loadCostToday();
    expect(cost.alerts).toBe(6);
    expect(api.costToday).not.toHaveBeenCalled();
  });

  it("decides offline: status flips and the audit trail grows", async () => {
    vi.mocked(api.decide).mockRejectedValue(new Error("offline"));

    const before = await loadAlert("alert-helvetia");
    const decided = await decide("alert-helvetia", "re_kyc");

    expect(decided.status).toBe("actioned");
    expect(decided.audit.length).toBe(before.audit.length + 1);
    expect(decided.audit.at(-1)?.type).toBe("decision:re_kyc");

    // the mutation persists in the session store
    const after = await loadAlert("alert-helvetia");
    expect(after.status).toBe("actioned");
  });

  it("maps each action to the right resulting status", async () => {
    vi.mocked(api.decide).mockRejectedValue(new Error("offline"));
    expect((await decide("alert-meridian", "escalate")).status).toBe("escalated");
    expect((await decide("alert-alpine", "no_change")).status).toBe("dismissed");
  });
});
