"use client";

import { formatTokens, type ClientRow } from "@/lib/cost-view";

// Per-client breakdown, expensive cases first. Depth shows how far each case went
// down the cascade; the band pill carries the cockpit risk colour. This is where a
// reviewer confirms spend tracks risk: the HIGH cases are the ones that cost money.
export function ClientCostTable({ rows }: { rows: ClientRow[] }) {
  return (
    <section
      className="dw-in rounded-[10px] border bg-white p-4"
      style={{ borderColor: "oklch(0.922 0 0)", boxShadow: "0 1px 2px rgba(0,0,0,.04)" }}
    >
      <div className="font-mono text-[9.5px]" style={{ letterSpacing: "0.14em", color: "oklch(0.6 0 0)" }}>
        SPEND BY CLIENT
      </div>
      <table className="mt-3 w-full border-collapse text-left">
        <thead>
          <tr className="font-mono text-[10px]" style={{ color: "oklch(0.55 0 0)" }}>
            <th className="pb-2 font-medium">CLIENT</th>
            <th className="pb-2 font-medium">DEPTH</th>
            <th className="pb-2 font-medium">BAND</th>
            <th className="pb-2 text-right font-medium">TOKENS</th>
            <th className="pb-2 text-right font-medium">SPEND</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.clientId} className="border-t" style={{ borderColor: "oklch(0.95 0 0)" }}>
              <td className="py-2 text-[13px]" style={{ color: "oklch(0.25 0 0)" }}>
                {r.clientName}
              </td>
              <td className="py-2 font-mono text-[12px]" style={{ color: "oklch(0.45 0 0)" }}>
                step {r.depth}
              </td>
              <td className="py-2">
                <span
                  className="rounded-full px-[7px] py-[1px] font-mono text-[10px] uppercase"
                  style={{ background: r.bandBg, border: "1px solid " + r.bandBorder, color: r.bandText }}
                >
                  {r.band}
                </span>
              </td>
              <td className="py-2 text-right font-mono text-[12px]" style={{ color: "oklch(0.45 0 0)" }}>
                {formatTokens(r.tokensIn + r.tokensOut)}
              </td>
              <td className="py-2 text-right font-mono text-[12.5px] font-semibold" style={{ color: "oklch(0.2 0 0)" }}>
                {r.usdText}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
