"use client";

import Link from "next/link";
import { useCost } from "@/lib/use-cost";
import {
  clientRows,
  compositionSplit,
  efficiency,
  modelRows,
  stageBars,
} from "@/lib/cost-view";
import { CostSummary } from "@/components/dashboard/CostSummary";
import { CascadeFunnel } from "@/components/dashboard/CascadeFunnel";
import { ModelSplit } from "@/components/dashboard/ModelSplit";
import { ClientCostTable } from "@/components/dashboard/ClientCostTable";
import { EfficiencyCallout } from "@/components/dashboard/EfficiencyCallout";

// The shared cost and efficiency dashboard. Read-only, reachable by any role, it reads
// the cost view models from useCost (live backend when opted in, demo seed otherwise)
// and lays out the meter, the cascade funnel, the model and client breakdowns, and the
// efficiency callout. It mutates nothing, so the recommend-never-act invariant holds.
export default function CostDashboardPage() {
  const { data, source } = useCost();
  const eff = efficiency(data);

  return (
    <div className="flex min-h-screen w-full flex-col bg-white">
      <Header source={source} />
      <main className="mx-auto w-full max-w-[1100px] flex-1 px-5 py-6">
        <div className="flex flex-col gap-4">
          <CostSummary
            totals={data.totals}
            composition={compositionSplit(data)}
            usdPerAlertText={eff.usdPerAlertText}
          />
          <EfficiencyCallout eff={eff} />
          <CascadeFunnel bars={stageBars(data)} />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ModelSplit rows={modelRows(data)} />
            <ClientCostTable rows={clientRows(data)} />
          </div>
        </div>
      </main>
    </div>
  );
}

function Header({ source }: { source: "live" | "demo" }) {
  const isLive = source === "live";
  return (
    <div
      className="flex h-14 flex-none items-center justify-between border-b bg-white px-[18px]"
      style={{ borderColor: "oklch(0.922 0 0)" }}
    >
      <div className="flex items-center gap-[11px]">
        <div className="font-mono text-xs font-medium" style={{ letterSpacing: "0.26em" }}>
          DRIFTWATCH
        </div>
        <div
          className="border-l pl-[11px] font-mono text-[9.5px]"
          style={{ letterSpacing: "0.16em", color: "oklch(0.6 0 0)", borderColor: "oklch(0.9 0 0)" }}
        >
          COST &amp; EFFICIENCY
        </div>
      </div>
      <div className="flex items-center gap-[14px]">
        <span
          className="rounded-full px-[9px] py-[3px] font-mono text-[9px]"
          style={{
            letterSpacing: "0.1em",
            background: isLive ? "#eaf3de" : "oklch(0.95 0 0)",
            color: isLive ? "#173404" : "oklch(0.45 0 0)",
            border: "1px solid " + (isLive ? "#97c459" : "oklch(0.88 0 0)"),
          }}
        >
          {isLive ? "LIVE" : "DEMO DATA"}
        </span>
        <Link
          href="/"
          className="cursor-pointer rounded-lg border bg-white px-[11px] py-[7px] font-mono text-[10px]"
          style={{ letterSpacing: "0.12em", color: "oklch(0.5 0 0)", borderColor: "oklch(0.9 0 0)" }}
        >
          &larr; COCKPIT
        </Link>
      </div>
    </div>
  );
}
