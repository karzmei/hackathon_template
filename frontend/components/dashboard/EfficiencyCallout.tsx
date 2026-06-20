"use client";

import type { Efficiency } from "@/lib/cost-view";

// The one-line efficiency story for judges: most of the spend lands on the few cases
// that became actionable, and a batch of immaterial cases was cleared for ~$0.
export function EfficiencyCallout({ eff }: { eff: Efficiency }) {
  return (
    <section
      className="dw-in rounded-[10px] border p-4"
      style={{ borderColor: "#c9dcff", background: "#f3f7ff" }}
    >
      <div className="font-mono text-[9.5px]" style={{ letterSpacing: "0.14em", color: "#1e3a8a" }}>
        WHY THIS IS COST EFFICIENT
      </div>
      <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: "oklch(0.3 0 0)" }}>
        {eff.deepSpendShare} of spend went to the {eff.actionableAlerts} cases that drifted into an
        actionable risk band, at {eff.usdPerActionableText} each; {eff.cheapExits} immaterial cases
        were cleared at the rules stage for ~$0. Blended cost is {eff.usdPerAlertText} per client.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Stat label="per actionable case" value={eff.usdPerActionableText} />
        <Stat label="per client (blended)" value={eff.usdPerAlertText} />
        <Stat label="cleared for ~$0" value={String(eff.cheapExits)} />
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-[7px] border bg-white px-3 py-2"
      style={{ borderColor: "#d4e1fb" }}
    >
      <div className="font-mono text-[15px] font-semibold" style={{ color: "#1e3a8a" }}>
        {value}
      </div>
      <div className="text-[10.5px]" style={{ color: "oklch(0.5 0 0)" }}>
        {label}
      </div>
    </div>
  );
}
