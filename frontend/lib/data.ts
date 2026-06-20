// Mock-first data layer. The cockpit calls these instead of `api` directly: each
// tries the real backend and falls back to the typed mock dataset when the API is
// unavailable (or when NEXT_PUBLIC_USE_MOCK forces it). This keeps the demo fully
// working offline while transparently using the backend once it is up.

import { api } from "@/lib/api";
import type { Alert, AlertRow, CostToday, RecommendedAction } from "@/lib/api";
import { mockAlerts, mockCostToday, toRow } from "@/lib/mock";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

// In-session mutable copy of the mock alerts so offline decisions persist while the
// page is open (the real backend persists in store.py; this mirrors that for mock).
let store: Record<string, Alert> = clone(mockAlerts);

// Read per call (not at module load) so tests can toggle the flag with vi.stubEnv.
function forceMock(): boolean {
  return process.env.NEXT_PUBLIC_USE_MOCK === "1";
}

async function withFallback<T>(call: () => Promise<T>, fallback: () => T): Promise<T> {
  if (forceMock()) return fallback();
  try {
    return await call();
  } catch {
    return fallback();
  }
}

export function loadAlertRows(): Promise<AlertRow[]> {
  return withFallback(
    () => api.listAlerts(),
    () => Object.values(store).map(toRow),
  );
}

export function loadAlert(id: string): Promise<Alert> {
  return withFallback(
    () => api.getAlert(id),
    () => {
      const found = store[id];
      if (!found) throw new Error(`Unknown alert ${id}`);
      return clone(found);
    },
  );
}

export function loadCostToday(): Promise<CostToday> {
  return withFallback(
    () => api.costToday(),
    () => clone(mockCostToday),
  );
}

export function runPipeline(): Promise<{ alerts: AlertRow[] }> {
  return withFallback(
    () => api.runPipeline(),
    () => ({ alerts: Object.values(store).map(toRow) }),
  );
}

// Map an analyst action to the resulting alert status (mirrors step4 in the backend).
function statusFor(action: RecommendedAction): Alert["status"] {
  if (action === "escalate") return "escalated";
  if (action === "no_change") return "dismissed";
  return "actioned";
}

export function decide(id: string, action: RecommendedAction): Promise<Alert> {
  return withFallback(
    () => api.decide(id, action),
    () => {
      const current = store[id];
      if (!current) throw new Error(`Unknown alert ${id}`);
      const next: Alert = {
        ...clone(current),
        status: statusFor(action),
        audit: [
          ...current.audit,
          {
            entity_id: id,
            type: `decision:${action}`,
            actor: "analyst",
            payload: { action },
            at: new Date().toISOString(),
          },
        ],
      };
      store[id] = next;
      return clone(next);
    },
  );
}

// Test helper: restore the mock store to its seeded state between cases.
export function __resetMockStore(): void {
  store = clone(mockAlerts);
}
