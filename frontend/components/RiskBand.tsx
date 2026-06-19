import { DriftScore } from "@/lib/api";

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
  const tone =
    drift.band === "high"
      ? "border-red-400 bg-red-50"
      : drift.band === "medium"
        ? "border-amber-400 bg-amber-50"
        : "border-emerald-400 bg-emerald-50";

  return (
    <section className={`rounded-lg border-l-4 ${tone} p-4`}>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="font-serif text-2xl text-navy">{riskBand}</h2>
        <span className="text-sm text-ink">
          confidence {(drift.confidence * 100).toFixed(0)}%
        </span>
        <span className="text-sm text-ink">
          {drift.invalidated_assumptions.length} invalidated assumption
          {drift.invalidated_assumptions.length === 1 ? "" : "s"}
        </span>
      </div>
      <p className="mt-2 text-ink">{implies}</p>
    </section>
  );
}
