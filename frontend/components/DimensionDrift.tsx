import type { DriftScore } from "@/lib/api";
import { dimensionRows, levelColor } from "@/lib/cockpit";

// Per-dimension drift: baseline -> current for every KYC dimension, with a bar sized
// to the delta. This is the cockpit's "baseline vs current" view.
export function DimensionDrift({ drift }: { drift: DriftScore }) {
  const rows = dimensionRows(drift);
  return (
    <div>
      <div className="mb-0.5 mt-5 font-mono text-[10px] tracking-wider text-muted-foreground">
        DRIFT BY DIMENSION - BASELINE -&gt; CURRENT
      </div>
      <ul>
        {rows.map((r) => {
          const color = levelColor(r.level);
          return (
            <li key={r.dimension} className="border-t py-3">
              <div className="flex items-center gap-3.5">
                <span className="w-32 flex-none text-xs font-medium text-muted-foreground">
                  {r.dimension}
                </span>
                <div className="relative flex h-3.5 flex-1 items-center">
                  <div className="absolute inset-x-0 h-0.5 rounded-sm bg-border" />
                  {r.changed && (
                    <div
                      data-testid="dimension-bar"
                      className="absolute left-0 h-0.5 rounded-sm"
                      style={{ width: r.width, background: color }}
                    />
                  )}
                  <div
                    className="absolute h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2 border-white"
                    style={{
                      left: r.width,
                      background: r.changed ? color : "var(--border)",
                      boxShadow: r.changed ? `0 0 0 1.5px ${color}` : undefined,
                    }}
                  />
                </div>
                <span
                  className="w-9 flex-none text-right font-mono text-[11px] font-semibold"
                  style={{ color: r.changed ? color : "var(--muted-foreground)" }}
                >
                  {r.pct}
                </span>
              </div>
              <div className="mt-1.5 flex items-baseline gap-2.5 pl-[142px]">
                <span className="font-serif text-[13px] text-muted-foreground">{r.from}</span>
                <span className="text-xs text-border">-&gt;</span>
                <span
                  className="font-serif text-[13px] font-semibold"
                  style={{ color: r.changed ? "var(--foreground)" : "var(--muted-foreground)" }}
                >
                  {r.to}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
