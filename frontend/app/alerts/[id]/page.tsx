"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Alert, api } from "@/lib/api";
import { RiskBand } from "@/components/RiskBand";
import { BaselineVsCurrent } from "@/components/BaselineVsCurrent";
import { SignalTimeline } from "@/components/SignalTimeline";
import { CostMeter } from "@/components/CostMeter";
import { ActionBar } from "@/components/ActionBar";
import { StatusPill } from "@/components/StatusPill";

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

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!alert) return <p className="text-slate-500">Loading...</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-navy underline">
          {"← back to queue"}
        </Link>
        <div className="flex items-center gap-3">
          <StatusPill status={alert.status} />
          <CostMeter cost={alert.cost} depth={alert.analysis_depth} />
        </div>
      </div>

      <div>
        <h1 className="font-serif text-2xl text-navy">{alert.client_name}</h1>
        <p className="text-sm text-slate-500">
          Recommended action:{" "}
          <span className="font-semibold">{alert.recommended_action}</span>
        </p>
      </div>

      {/* 1. Most important first: risk delta + what it implies */}
      <RiskBand riskBand={alert.risk_band} drift={alert.drift_score} implies={alert.implies} />

      {/* 3. Baseline vs current */}
      <BaselineVsCurrent baseline={alert.baseline} current={alert.current} />

      {/* 2. What changed and when */}
      <SignalTimeline signals={alert.signals} />

      {/* 4. Human-in-the-loop */}
      <ActionBar alertId={alert.id} onDecided={refresh} />

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="font-serif text-lg text-navy mb-2">Audit trail</h3>
        <ul className="space-y-1 text-xs text-slate-600">
          {alert.audit.map((e, i) => (
            <li key={i}>
              <span className="font-mono">{e.at}</span> — {e.type} by{" "}
              <span className="font-medium">{e.actor}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
