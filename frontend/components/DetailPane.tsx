"use client";

import type { Alert, AuditEvent } from "@/lib/api";
import { clientMeta } from "@/lib/mock";
import { StatusPill } from "@/components/StatusPill";
import { CostMeter } from "@/components/CostMeter";
import { DriftBand } from "@/components/DriftBand";
import { DimensionDrift } from "@/components/DimensionDrift";
import { SignalTimeline } from "@/components/SignalTimeline";
import { ActionBar } from "@/components/ActionBar";

// One audit event -> a compact human line for the trail under the actions.
function auditText(e: AuditEvent): string {
  if (e.type.startsWith("decision")) return `decision by ${e.actor}`;
  return `${e.type} by ${e.actor}`;
}

// The case file: risk delta first, then baseline-vs-current, the source-cited
// timeline, and finally the three human decisions with the audit trail. The order
// is the product invariant; do not reshuffle these sections.
export function DetailPane({
  alert,
  onDecided,
}: {
  alert: Alert;
  onDecided: () => void;
}) {
  const meta = clientMeta[alert.id];
  return (
    <div className="flex min-h-0 flex-col overflow-y-auto">
      <div className="flex flex-none items-start justify-between gap-4 border-b px-7 py-5">
        <div>
          <h1 className="mb-1 font-serif text-xl font-semibold tracking-tight">
            {alert.client_name}
          </h1>
          <div className="font-mono text-xs text-muted-foreground">
            {meta
              ? `${meta.jurisdiction} - LEI ${meta.lei} - ${meta.onboarded}`
              : alert.client_id}
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <CostMeter cost={alert.cost} depth={alert.analysis_depth} label="" />
          <StatusPill status={alert.status} />
        </div>
      </div>

      <div className="grid flex-1 grid-cols-[1.32fr_1fr]">
        <div className="border-r px-7 py-5">
          <DriftBand drift={alert.drift_score} riskBand={alert.risk_band} />
          <DimensionDrift drift={alert.drift_score} />
          <div className="mt-4 rounded-[10px] border bg-muted/40 px-4 py-3.5">
            <p className="font-serif text-[13.5px] leading-relaxed text-foreground/85">
              {alert.implies}
            </p>
          </div>
        </div>

        <div className="px-7 py-5">
          <div className="mb-1 font-mono text-[10px] tracking-wider text-muted-foreground">
            SOURCE-CITED TIMELINE
          </div>
          <SignalTimeline signals={alert.signals} />
        </div>
      </div>

      <div className="flex-none border-t bg-muted/40 px-7 py-4">
        <ActionBar alertId={alert.id} onDecided={onDecided} />
        <div className="mt-3 border-t pt-3 font-mono text-[11px] text-muted-foreground">
          {alert.audit.map(auditText).join(" - ")}
        </div>
      </div>
    </div>
  );
}
