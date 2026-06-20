"use client";

import { formatTokens, formatUsd, type ModelRow } from "@/lib/cost-view";

// Spend split by model tier: the mid-tier reasoning deployment versus the deep
// deployment. Shows the deliberate tiering, cheap model for the filter, capable
// model only for the deep narrative.
export function ModelSplit({ rows }: { rows: ModelRow[] }) {
  return (
    <section
      className="dw-in rounded-[10px] border bg-white p-4"
      style={{ borderColor: "oklch(0.922 0 0)", boxShadow: "0 1px 2px rgba(0,0,0,.04)" }}
    >
      <div className="font-mono text-[9.5px]" style={{ letterSpacing: "0.14em", color: "oklch(0.6 0 0)" }}>
        SPEND BY MODEL TIER
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {rows.map((r) => (
          <div
            key={r.model}
            className="flex items-center justify-between rounded-[7px] border px-3 py-2"
            style={{ borderColor: "oklch(0.93 0 0)", background: "oklch(0.985 0 0)" }}
          >
            <div>
              <div className="font-mono text-[12.5px] font-semibold" style={{ color: "oklch(0.22 0 0)" }}>
                {r.model}
              </div>
              <div className="text-[11px]" style={{ color: "oklch(0.55 0 0)" }}>
                {r.label} · {formatTokens(r.tokensIn)} in / {formatTokens(r.tokensOut)} out
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-[14px] font-semibold" style={{ color: "oklch(0.2 0 0)" }}>
                {formatUsd(r.usd)}
              </div>
              <div className="font-mono text-[10px]" style={{ color: "oklch(0.55 0 0)" }}>
                {r.usdPct} of spend
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
