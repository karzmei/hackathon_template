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
    <span className="inline-flex items-center gap-2 rounded-md border bg-card px-2 py-1 text-xs text-foreground">
      {depthLabel && (
        <span className="font-semibold tracking-wide text-foreground">
          {depthLabel}
        </span>
      )}
      <span>
        ~${cost.usd.toFixed(4)} {label}
      </span>
      <span className="text-muted-foreground">
        ({cost.tokens_in + cost.tokens_out} tok)
      </span>
    </span>
  );
}
