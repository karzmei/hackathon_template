// @smoke
import { describe, it, expect, afterEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { costSeed } from "./cost-seed";

// USE_BACKEND is read at module load, so each case stubs the env and re-imports the
// hook through a reset module registry to exercise the on/off branches in isolation.

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function loadHook() {
  vi.resetModules();
  return (await import("./use-cost")).useCost;
}

function okJson(payload: unknown) {
  return { ok: true, status: 200, statusText: "OK", json: async () => payload } as Response;
}

describe("useCost", () => {
  it("shows the demo seed when live mode is off", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_BACKEND", "");
    const useCost = await loadHook();

    const { result } = renderHook(() => useCost());

    expect(result.current.source).toBe("demo");
    expect(result.current.data).toEqual(costSeed);
    expect(result.current.ready).toBe(true);
  });

  it("uses live data when the backend responds", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_BACKEND", "true");
    const live = { ...costSeed, generated_at: "2026-06-20T09:00:00Z" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(okJson(live)));
    const useCost = await loadHook();

    const { result } = renderHook(() => useCost());

    await waitFor(() => expect(result.current.source).toBe("live"));
    expect(result.current.data.generated_at).toBe("2026-06-20T09:00:00Z");
  });

  it("keeps the demo seed when the backend fails", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_BACKEND", "true");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("backend down")));
    const useCost = await loadHook();

    const { result } = renderHook(() => useCost());

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.source).toBe("demo");
    expect(result.current.data).toEqual(costSeed);
  });
});
