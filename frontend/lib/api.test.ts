import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { api } from "./api";

// The typed client talks to the backend over fetch. We stub global.fetch so the
// tests are pure and offline: they assert the URL, method, and body the client builds,
// and that it parses JSON or raises a useful error.

const BASE = "http://localhost:8000";

function okJson(payload: unknown) {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => payload,
  } as Response;
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("api client", () => {
  it("listAlerts GETs /api/alerts and returns parsed rows", async () => {
    const rows = [{ id: "a1", client_name: "Helvetia" }];
    fetchMock.mockResolvedValue(okJson(rows));

    const result = await api.listAlerts();

    expect(result).toEqual(rows);
    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}/api/alerts`);
  });

  it("runPipeline POSTs /api/run", async () => {
    fetchMock.mockResolvedValue(okJson({ alerts: [] }));

    await api.runPipeline();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}/api/run`);
    expect(init).toMatchObject({ method: "POST" });
  });

  it("getAlert builds the per-id URL", async () => {
    fetchMock.mockResolvedValue(okJson({ id: "helvetia" }));

    await api.getAlert("helvetia");

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}/api/alerts/helvetia`);
  });

  it("decide POSTs the action, reason, and analyst actor", async () => {
    fetchMock.mockResolvedValue(okJson({ id: "helvetia" }));

    await api.decide("helvetia", "re_kyc", "owners changed");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}/api/alerts/helvetia/decision`);
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({
      action: "re_kyc",
      reason: "owners changed",
      actor: "analyst",
    });
  });

  it("costToday GETs /api/cost/today", async () => {
    fetchMock.mockResolvedValue(okJson({ usd: 0, alerts: 0 }));

    await api.costToday();

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}/api/cost/today`);
  });

  it("costDashboard GETs /api/cost/dashboard and returns the parsed payload", async () => {
    const payload = { generated_at: "x", totals: { usd: 0, alerts: 0 }, by_stage: [], by_client: [] };
    fetchMock.mockResolvedValue(okJson(payload));

    const result = await api.costDashboard();

    expect(result).toEqual(payload);
    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}/api/cost/dashboard`);
  });

  it("omits the Content-Type header on GETs to avoid a CORS preflight", async () => {
    fetchMock.mockResolvedValue(okJson([]));

    await api.listAlerts();

    const [, init] = fetchMock.mock.calls[0];
    expect(init?.headers).toBeUndefined();
  });

  it("sets the JSON Content-Type on mutating POSTs", async () => {
    fetchMock.mockResolvedValue(okJson({ alerts: [] }));

    await api.runPipeline();

    const [, init] = fetchMock.mock.calls[0];
    expect(init?.headers).toMatchObject({ "Content-Type": "application/json" });
  });

  it("throws with status and detail on a non-ok response", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: async () => ({ detail: "alert not found" }),
    } as Response);

    await expect(api.getAlert("missing")).rejects.toThrow("API 404: alert not found");
  });

  it("falls back to the status text when the error body is not JSON", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: async () => {
        throw new Error("not json");
      },
    } as unknown as Response);

    await expect(api.listAlerts()).rejects.toThrow("API 500: Internal Server Error");
  });

  it("aborts a request that outlives the timeout", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(
      (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
        }),
    );

    const pending = api.listAlerts();
    // Attach the rejection handler before advancing timers so the abort that fires
    // mid-advance is not flagged as an unhandled rejection.
    const assertion = expect(pending).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(700);
    await assertion;
    vi.useRealTimers();
  });
});
