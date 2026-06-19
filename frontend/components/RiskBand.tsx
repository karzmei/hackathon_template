import { DriftScore } from "@/lib/api";
import { bandTone } from "@/lib/risk";
import { SeverityBadge } from "@/components/ui/severity-badge";

// Most-important-first: the risk delta and what it implies, before any raw signals.
export function RiskBand({
  riskBand,
  drift,
  implies,
}: {
  riskBand: string;
  drift: DriftScore;
  implies: string;
}) {
  const tone = bandTone(drift.band);
  const accent =
    tone === "danger"
      ? "var(--color-border-danger)"
      : tone === "warning"
        ? "var(--color-border-warning)"
        : "var(--color-border-success)";

  return (
    <section
      className="rounded-xl border bg-card p-5 ring-1 ring-foreground/10"
      style={{ borderLeft: `4px solid ${accent}` }}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2 className="font-serif text-2xl font-semibold tracking-tight">
          {riskBand}
        </h2>
        <SeverityBadge tone={tone} label={drift.band.toUpperCase()} />
        <span className="text-sm text-muted-foreground">
          confidence {(drift.confidence * 100).toFixed(0)}%
        </span>
        <span className="text-sm text-muted-foreground">
          {drift.invalidated_assumptions.length} invalidated assumption
          {drift.invalidated_assumptions.length === 1 ? "" : "s"}
        </span>
      </div>
      <p className="mt-3 leading-relaxed text-foreground">{implies}</p>
    </section>
  );
}
