// State for the cost dashboard. It mirrors the cockpit's data policy: a self-contained
// demo seed by default, and an opt-in live mode (NEXT_PUBLIC_USE_BACKEND=true) that
// pulls GET /api/cost/dashboard. On any failure or the 700ms timeout it keeps the seed,
// so the dashboard never blocks on a dead backend. The `source` label is surfaced in the
// UI, so a demo fallback is always explicit and never a silent mock.

"use client";

import { useEffect, useState } from "react";
import { api, type CostDashboard } from "@/lib/api";
import { costSeed } from "@/lib/cost-seed";

const USE_BACKEND = process.env.NEXT_PUBLIC_USE_BACKEND === "true";

export type CostSource = "live" | "demo";

export interface CostState {
  data: CostDashboard;
  source: CostSource;
  ready: boolean;
}

export function useCost(): CostState {
  const [data, setData] = useState<CostDashboard>(costSeed);
  const [source, setSource] = useState<CostSource>("demo");
  const [ready, setReady] = useState(!USE_BACKEND);

  useEffect(() => {
    if (!USE_BACKEND) return;
    let cancelled = false;
    api
      .costDashboard()
      .then((live) => {
        if (cancelled) return;
        setData(live);
        setSource("live");
      })
      .catch(() => {
        // Keep the seed; the demo stands.
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, source, ready };
}
