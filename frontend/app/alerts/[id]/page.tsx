"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Alert, api } from "@/lib/api";
import { RiskBand } from "@/components/RiskBand";
import { BaselineVsCurrent } from "@/components/BaselineVsCurrent";
import { SignalTimeline } from "@/components/SignalTimeline";
import { CostMeter } from "@/components/CostMeter";
import { ActionBar } from "@/components/ActionBar";
import { StatusPill } from "@/components/StatusPill";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AlertDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [alert, setAlert] = useState<Alert | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setAlert(await api.getAlert(id));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!alert) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          back to queue
        </Link>
        <div className="flex items-center gap-3">
          <StatusPill status={alert.status} />
          <CostMeter cost={alert.cost} depth={alert.analysis_depth} />
        </div>
      </div>

      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight">
          {alert.client_name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Recommended action:{" "}
          <span className="font-semibold text-foreground">
            {alert.recommended_action}
          </span>
        </p>
      </div>

      {/* 1. Most important first: risk delta + what it implies */}
      <RiskBand
        riskBand={alert.risk_band}
        drift={alert.drift_score}
        implies={alert.implies}
      />

      {/* 3. Baseline vs current */}
      <BaselineVsCurrent baseline={alert.baseline} current={alert.current} />

      {/* 2. What changed and when */}
      <SignalTimeline signals={alert.signals} />

      {/* 4. Human-in-the-loop */}
      <ActionBar alertId={alert.id} onDecided={refresh} />

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-base">Audit trail</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {alert.audit.map((e, i) => (
              <li key={i}>
                <span className="font-mono">{e.at}</span> · {e.type} by{" "}
                <span className="font-medium text-foreground">{e.actor}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
