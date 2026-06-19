"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Play } from "lucide-react";
import { api, AlertRow, CostToday } from "@/lib/api";
import { StatusPill } from "@/components/StatusPill";
import { CostMeter } from "@/components/CostMeter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SeverityBadge } from "@/components/ui/severity-badge";
import { bandAccentVar } from "@/lib/risk";

function rowTone(riskBand: string) {
  if (riskBand.includes("HIGH")) return "danger" as const;
  if (riskBand.includes("MEDIUM")) return "warning" as const;
  return "success" as const;
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
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-serif text-2xl font-semibold tracking-tight">
          Alert queue
        </h1>
        <div className="flex items-center gap-4">
          {cost && (
            <CostMeter
              cost={{
                tokens_in: cost.tokens_in,
                tokens_out: cost.tokens_out,
                usd: cost.usd,
              }}
              label="today"
            />
          )}
          <Button variant="brand" size="lg" onClick={run} disabled={running}>
            {running ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Play />
            )}
            {running ? "Running pipeline..." : "Run pipeline"}
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {rows.length === 0 ? (
        <p className="text-muted-foreground">
          No alerts yet. Click <strong>Run pipeline</strong> to ingest signals
          and score drift.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id}>
              <Link href={`/alerts/${row.id}`} className="block">
                <Card
                  className="transition-colors hover:bg-muted/40"
                  style={{
                    borderLeft: `4px solid ${bandAccentVar(row.risk_band)}`,
                  }}
                >
                  <div className="flex items-center justify-between gap-4 px-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-medium">{row.client_name}</span>
                        <SeverityBadge
                          tone={rowTone(row.risk_band)}
                          label={row.risk_band}
                          size="sm"
                        />
                        <StatusPill status={row.status} />
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {row.top_change}
                      </p>
                    </div>
                    <CostMeter cost={row.cost} depth={row.analysis_depth} />
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
