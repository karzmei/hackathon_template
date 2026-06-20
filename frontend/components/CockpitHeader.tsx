"use client";

import { Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

// Top bar: brand, the live cost/throughput pill, and the Run pipeline control.
export function CockpitHeader({
  usd,
  signals,
  alerts,
  deep,
  running,
  onRun,
}: {
  usd: number;
  signals: number;
  alerts: number;
  deep: number;
  running: boolean;
  onRun: () => void;
}) {
  return (
    <header className="flex flex-none items-center justify-between border-b px-6 py-3">
      <div className="flex items-center gap-2.5">
        <span className="size-2.5 rounded-[2px] bg-foreground" aria-hidden />
        <span className="text-[15px] font-bold tracking-tight">DRIFTWATCH</span>
        <span className="font-mono text-xs text-muted-foreground">/ queue</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5 rounded-full border bg-muted/40 px-3.5 py-1.5">
          <span className="font-mono text-[11px] text-muted-foreground">TODAY</span>
          <span className="font-mono text-xs font-semibold">${usd.toFixed(2)}</span>
          <span className="h-3 w-px bg-border" aria-hidden />
          <span className="font-mono text-[11px] text-muted-foreground">
            {signals.toLocaleString("en-US")} signals - {alerts} alerts - {deep} deep
          </span>
        </div>
        <Button variant="brand" size="lg" onClick={onRun} disabled={running}>
          {running ? <Loader2 className="animate-spin" /> : <Play />}
          {running ? "Running pipeline..." : "Run pipeline"}
        </Button>
      </div>
    </header>
  );
}
