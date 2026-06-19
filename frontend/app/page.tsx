"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, AlertRow, CostToday } from "@/lib/api";
import { StatusPill } from "@/components/StatusPill";
import { CostMeter } from "@/components/CostMeter";

function bandTint(riskBand: string): string {
  if (riskBand.includes("HIGH")) return "border-l-red-500";
  if (riskBand.includes("MEDIUM")) return "border-l-amber-500";
  return "border-l-emerald-500";
}

export default function QueuePage() {
  const [rows, setRows] = useState<AlertRow[]>([]);
  const [cost, setCost] = useState<CostToday | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [alerts, costToday] = await Promise.all([
        api.listAlerts(),
        api.costToday(),
      ]);
      setRows(alerts);
      setCost(costToday);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function run() {
    setRunning(true);
    setError(null);
    try {
      await api.runPipeline();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Run failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl text-navy">Alert queue</h1>
        <div className="flex items-center gap-4">
          {cost && (
            <CostMeter
              cost={{ tokens_in: cost.tokens_in, tokens_out: cost.tokens_out, usd: cost.usd }}
              label="today"
            />
          )}
          <button
            onClick={run}
            disabled={running}
            className="rounded bg-navy px-4 py-2 text-sm font-medium text-cream disabled:opacity-50"
          >
            {running ? "Running pipeline..." : "Run pipeline"}
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {rows.length === 0 ? (
        <p className="text-slate-500">
          No alerts yet. Click <strong>Run pipeline</strong> to ingest signals and
          score drift.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                href={`/alerts/${row.id}`}
                className={`block rounded-lg border border-slate-200 border-l-4 bg-white p-4 hover:bg-slate-50 ${bandTint(row.risk_band)}`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-navy">{row.client_name}</span>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold">
                        {row.risk_band}
                      </span>
                      <StatusPill status={row.status} />
                    </div>
                    <p className="mt-1 text-sm text-ink">{row.top_change}</p>
                  </div>
                  <CostMeter cost={row.cost} depth={row.analysis_depth} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
