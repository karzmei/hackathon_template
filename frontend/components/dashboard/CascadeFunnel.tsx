"use client";

import { formatUsd, type StageBar } from "@/lib/cost-view";

// The cost-efficiency centrepiece: one row per cascade stage. The bar width is the
// stage's share of total spend, so the eye sees spend concentrate in the deep stage
// even though it handles the fewest cases. Each row also shows the volume it handled
// (entered) and how many it passed on (survived), so the attrition reads at a glance.
export function CascadeFunnel({ bars }: { bars: StageBar[] }) {
  return (
    <section
      className="dw-in rounded-[10px] border bg-white p-4"
      style={{ borderColor: "oklch(0.922 0 0)", boxShadow: "0 1px 2px rgba(0,0,0,.04)" }}
    >
      <div className="font-mono text-[9.5px]" style={{ letterSpacing: "0.14em", color: "oklch(0.6 0 0)" }}>
        SPEND BY CASCADE STAGE
      </div>
      <p className="mt-1 mb-3 text-[12px]" style={{ color: "oklch(0.5 0 0)" }}>
        Cheap rules clear most cases for ~$0; only survivors reach the paid LLM stages.
      </p>
      <div className="flex flex-col gap-3">
        {bars.map((b) => (
          <div key={b.stage}>
            <div className="mb-[5px] flex items-baseline justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold" style={{ color: "oklch(0.25 0 0)" }}>
                  {b.label}
                </span>
                <span className="font-mono text-[10px]" style={{ color: "oklch(0.6 0 0)" }}>
                  {b.model ?? "no LLM"}
                </span>
              </div>
              <div className="flex items-center gap-3 font-mono text-[11px]" style={{ color: "oklch(0.4 0 0)" }}>
                <span aria-label={`${b.entered} entered, ${b.survived} survived`}>
                  {b.entered} &rarr; {b.survived}
                </span>
                <span className="font-semibold" style={{ color: "oklch(0.2 0 0)" }}>
                  {formatUsd(b.usd)}
                </span>
              </div>
            </div>
            <div className="h-[18px] w-full overflow-hidden rounded-[5px]" style={{ background: "oklch(0.96 0 0)" }}>
              <div
                className="dw-bar flex h-full items-center justify-end rounded-[5px] pr-2 font-mono text-[10px] font-semibold"
                style={{
                  width: b.usdPct,
                  minWidth: b.usd > 0 ? "2.5rem" : "0",
                  background: b.bg,
                  border: "1px solid " + b.border,
                  color: b.text,
                }}
                role="img"
                aria-label={`${b.label}: ${b.usdPct} of spend`}
              >
                {b.usdPct}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
