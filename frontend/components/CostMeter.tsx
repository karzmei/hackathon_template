import { Cost } from "@/lib/api";

// Per-alert (and optionally per-day) cost chip; the cost-efficiency story made visible.
export function CostMeter({
  cost,
  depth,
  label = "this alert",
}: {
  cost: Cost;
  depth?: number;
  label?: string;
}) {
  const depthLabel = depth ? ["", "BASIC", "REASONED", "DEEP"][depth] : null;
  return (
    <span className="inline-flex items-center gap-2 rounded border border-gold/50 bg-white px-2 py-1 text-xs text-ink">
      {depthLabel && <span className="font-semibold text-gold">{depthLabel}</span>}
      <span>
        ~${cost.usd.toFixed(4)} {label}
      </span>
      <span className="text-slate-400">
        ({cost.tokens_in + cost.tokens_out} tok)
      </span>
    </span>
  );
}
