import { Cost } from "@/lib/api";
import { depthLabel } from "@/lib/cockpit";

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
  // One depth vocabulary across the cockpit (FAST / STD / DEEP); see lib/cockpit.
  const depthTag = depth ? depthLabel(depth) : null;
  return (
    <span className="inline-flex items-center gap-2 rounded-md border bg-card px-2 py-1 text-xs text-foreground">
      {depthTag && (
        <span className="font-semibold tracking-wide text-foreground">
          {depthTag}
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
