"use client";

import { useCallback, useEffect, useState } from "react";
import type { Alert, AlertRow, CostToday } from "@/lib/api";
import * as data from "@/lib/data";
import { mockSignalsToday } from "@/lib/mock";
import { CockpitHeader } from "@/components/CockpitHeader";
import { QueueRail } from "@/components/QueueRail";
import { DetailPane } from "@/components/DetailPane";

// The cockpit: queue rail + case-file detail on one screen, driven by the mock-first
// data layer so it runs whether or not the backend is up.
export default function Cockpit() {
  const [rows, setRows] = useState<AlertRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [alert, setAlert] = useState<Alert | null>(null);
  const [cost, setCost] = useState<CostToday | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [nextRows, nextCost] = await Promise.all([
      data.loadAlertRows(),
      data.loadCostToday(),
    ]);
    setRows(nextRows);
    setCost(nextCost);
    return nextRows;
  }, []);

  useEffect(() => {
    refresh()
      .then((nextRows) => {
        setSelectedId((prev) => prev ?? nextRows[0]?.id ?? null);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [refresh]);

  useEffect(() => {
    if (!selectedId) {
      setAlert(null);
      return;
    }
    let active = true;
    data
      .loadAlert(selectedId)
      .then((a) => {
        if (active) setAlert(a);
      })
      .catch(() => {
        if (active) setAlert(null);
      });
    return () => {
      active = false;
    };
  }, [selectedId]);

  async function run() {
    setRunning(true);
    setError(null);
    try {
      await data.runPipeline();
      const nextRows = await refresh();
      setSelectedId((prev) => prev ?? nextRows[0]?.id ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Run failed");
    } finally {
      setRunning(false);
    }
  }

  async function onDecided() {
    await refresh();
    if (selectedId) {
      const updated = await data.loadAlert(selectedId).catch(() => null);
      setAlert(updated);
    }
  }

  const deep = rows.filter((r) => r.analysis_depth >= 3).length;

  return (
    <div className="flex h-screen flex-col bg-card">
      <CockpitHeader
        usd={cost?.usd ?? 0}
        signals={mockSignalsToday}
        alerts={rows.length}
        deep={deep}
        running={running}
        onRun={run}
      />
      {error && (
        <p className="border-b bg-destructive/5 px-6 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="grid min-h-0 flex-1 grid-cols-[392px_1fr]">
        <QueueRail rows={rows} selectedId={selectedId} onSelect={setSelectedId} />
        {alert ? (
          <DetailPane alert={alert} onDecided={onDecided} />
        ) : (
          <div className="flex items-center justify-center p-10 text-sm text-muted-foreground">
            {rows.length === 0
              ? "No alerts yet. Click Run pipeline to ingest signals and score drift."
              : "Select a client from the queue to open its case file."}
          </div>
        )}
      </div>
    </div>
  );
}
