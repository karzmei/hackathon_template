"use client";

import type { AlertRow, AlertStatus } from "@/lib/api";
import { clientMeta } from "@/lib/mock";
import {
  bandLevelFromText,
  depthLabel,
  driftPctLabel,
  levelColor,
} from "@/lib/cockpit";
import { bandAccentVar } from "@/lib/risk";
import { Sparkline } from "@/components/Sparkline";

// Queue status -> dot colour + short label. CLEARED maps onto the dismissed status.
const STATUS_META: Record<AlertStatus, { dot: string; label: string }> = {
  new: { dot: "var(--color-border-info)", label: "NEW" },
  needs_review: { dot: "var(--color-border-warning)", label: "NEEDS REVIEW" },
  escalated: { dot: "var(--color-border-danger)", label: "ESCALATED" },
  dismissed: { dot: "var(--color-border-success)", label: "CLEARED" },
  actioned: { dot: "var(--color-border-success)", label: "ACTIONED" },
};

function QueueItem({
  row,
  selected,
  onSelect,
}: {
  row: AlertRow;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const meta = clientMeta[row.id];
  const level = bandLevelFromText(row.risk_band);
  const status = STATUS_META[row.status];
  const sparkline = meta?.sparkline ?? [];
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(row.id)}
        aria-current={selected ? "true" : undefined}
        className="flex w-full items-center gap-3.5 border-b px-4 py-3.5 text-left transition-colors hover:bg-muted/40 aria-[current=true]:bg-muted"
        style={{
          borderLeft: `3px solid ${selected ? bandAccentVar(row.risk_band) : "transparent"}`,
        }}
      >
        <Sparkline values={sparkline} level={level} />
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-center justify-between gap-2">
            <span className="truncate font-serif text-sm font-semibold">
              {row.client_name}
            </span>
            <span
              className="flex-none font-mono text-[11px] font-semibold"
              style={{ color: levelColor(level) }}
            >
              {driftPctLabel(sparkline, meta?.trend ?? "flat")}
            </span>
          </div>
          <div className="mb-1 truncate text-xs text-muted-foreground">
            {row.top_change}
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
            <span style={{ color: status.dot }} aria-hidden>
              ●
            </span>
            {status.label} - {depthLabel(row.analysis_depth)} - ${row.cost.usd.toFixed(2)}
            {meta ? ` - ${meta.age}` : ""}
          </div>
        </div>
      </button>
    </li>
  );
}

// Left rail: the prioritised review queue. Selecting a row drives the detail pane.
export function QueueRail({
  rows,
  selectedId,
  onSelect,
}: {
  rows: AlertRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <aside className="flex min-h-0 flex-col overflow-y-auto border-r bg-muted/20">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-muted/20 px-4 py-3 backdrop-blur">
        <span className="text-xs font-semibold">
          Queue <span className="font-normal text-muted-foreground">- {rows.length}</span>
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">
          FINGERPRINT - DRIFT
        </span>
      </div>
      <ul>
        {rows.map((row) => (
          <QueueItem
            key={row.id}
            row={row}
            selected={row.id === selectedId}
            onSelect={onSelect}
          />
        ))}
      </ul>
    </aside>
  );
}
