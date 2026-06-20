import type { DriftScore } from "@/lib/api";
import { markerPct } from "@/lib/cockpit";

// Aggregate drift on a LOW/MEDIUM/HIGH gradient, with a marker at the score. This is
// the "risk delta + what it implies" header: the first thing an analyst should read.
export function DriftBand({
  drift,
  riskBand,
}: {
  drift: DriftScore;
  riskBand: string;
}) {
  const pct = markerPct(drift.aggregate);
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="font-mono text-[10px] tracking-wider text-muted-foreground">
          AGGREGATE DRIFT - {riskBand} - {Math.round(drift.confidence * 100)}% CONF
        </span>
        <span className="font-mono text-sm font-bold" style={{ color: "var(--color-text-danger)" }}>
          {drift.aggregate.toFixed(2)}{" "}
          <span className="font-medium text-muted-foreground">/ {drift.band.toUpperCase()}</span>
        </span>
      </div>
      <div
        className="relative h-2.5 rounded-[5px]"
        style={{
          background:
            "linear-gradient(90deg,#dcfce7 0%,#dcfce7 33%,#fef3c7 33%,#fef3c7 66%,#fecaca 66%,#fecaca 100%)",
        }}
      >
        <div
          data-testid="drift-marker"
          className="absolute top-[-5px] h-5 w-[3px] -translate-x-1/2 rounded-[2px] bg-foreground"
          style={{ left: `${pct}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-[9px] tracking-wide text-muted-foreground">
        <span>LOW</span>
        <span>MEDIUM</span>
        <span>HIGH</span>
      </div>
    </div>
  );
}
