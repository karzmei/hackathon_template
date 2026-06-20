"use client";

import type { CostToday } from "@/lib/api";
import { formatTokens, formatUsd, type Composition } from "@/lib/cost-view";

// The headline meter: total spend, the prompt-vs-completion token split, alerts
// processed, and the average cost per alert. Numbers lead, in mono, like the cockpit.
export function CostSummary({
  totals,
  composition,
  usdPerAlertText,
}: {
  totals: CostToday;
  composition: Composition;
  usdPerAlertText: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Card label="TOTAL SPEND TODAY">
        <div className="font-mono text-[26px] font-semibold" style={{ color: "oklch(0.205 0 0)" }}>
          {formatUsd(totals.usd)}
        </div>
        <div className="mt-1 text-[11.5px]" style={{ color: "oklch(0.556 0 0)" }}>
          across {totals.alerts} screened clients
        </div>
      </Card>

      <Card label="TOKENS">
        <div className="font-mono text-[26px] font-semibold" style={{ color: "oklch(0.205 0 0)" }}>
          {formatTokens(composition.total)}
        </div>
        <SplitBar composition={composition} />
      </Card>

      <Card label="ALERTS PROCESSED">
        <div className="font-mono text-[26px] font-semibold" style={{ color: "oklch(0.205 0 0)" }}>
          {totals.alerts}
        </div>
        <div className="mt-1 text-[11.5px]" style={{ color: "oklch(0.556 0 0)" }}>
          one KYC drift case each
        </div>
      </Card>

      <Card label="COST PER ALERT">
        <div className="font-mono text-[26px] font-semibold" style={{ color: "oklch(0.205 0 0)" }}>
          {usdPerAlertText}
        </div>
        <div className="mt-1 text-[11.5px]" style={{ color: "oklch(0.556 0 0)" }}>
          blended across the cascade
        </div>
      </Card>
    </div>
  );
}

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      className="dw-in rounded-[10px] border bg-white p-4"
      style={{ borderColor: "oklch(0.922 0 0)", boxShadow: "0 1px 2px rgba(0,0,0,.04)" }}
    >
      <div className="font-mono text-[9.5px]" style={{ letterSpacing: "0.14em", color: "oklch(0.6 0 0)" }}>
        {label}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

// Prompt vs completion tokens, as a two-segment bar with a labelled legend.
function SplitBar({ composition }: { composition: Composition }) {
  const inPct = Math.round(composition.inFraction * 100);
  const outPct = 100 - inPct;
  return (
    <div className="mt-2">
      <div className="flex h-[7px] w-full overflow-hidden rounded-full" style={{ background: "oklch(0.95 0 0)" }}>
        <div style={{ width: inPct + "%", background: "#4f7ce6" }} aria-hidden />
        <div style={{ width: outPct + "%", background: "#97c459" }} aria-hidden />
      </div>
      <div className="mt-[6px] flex justify-between font-mono text-[10px]" style={{ color: "oklch(0.5 0 0)" }}>
        <span>
          prompt {formatTokens(composition.tokensIn)} ({inPct}%)
        </span>
        <span>
          completion {formatTokens(composition.tokensOut)} ({outPct}%)
        </span>
      </div>
    </div>
  );
}
