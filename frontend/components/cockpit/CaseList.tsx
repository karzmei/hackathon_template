"use client";

import type { CockpitView } from "@/lib/cockpit-view";

// The middle rail: a kicker/title/subtitle header and the ranked case rows. Each
// row shows the band dot, status pill and materiality; unread rows pulse.
export function CaseList({ view, onSelect }: { view: CockpitView; onSelect: (id: string) => void }) {
  return (
    <div
      className="flex w-[372px] flex-none flex-col"
      style={{ borderRight: "1px solid oklch(0.922 0 0)", minHeight: 0 }}
    >
      <div className="flex-none border-b p-[15px_18px_13px]" style={{ borderColor: "oklch(0.922 0 0)" }}>
        <div className="font-mono text-[9.5px]" style={{ letterSpacing: "0.14em", color: "oklch(0.5 0 0)" }}>
          {view.listKicker}
        </div>
        <div className="mt-1 text-base font-semibold">{view.listTitle}</div>
        <div className="mt-[3px] text-xs" style={{ color: "oklch(0.556 0 0)" }}>
          {view.listSubtitle}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-[9px]">
        {view.list.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            aria-pressed={c.selected}
            className="dw-row-hover dw-in mb-[7px] block w-full cursor-pointer rounded-[10px] border p-[11px_12px] text-left"
            style={{
              borderColor: "oklch(0.922 0 0)",
              borderLeft: `3px solid ${c.accent}`,
              background: c.selected ? "oklch(0.97 0 0)" : "#ffffff",
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-[7px]">
                {c.unread && (
                  <span
                    className="dw-pulse inline-block h-[7px] w-[7px] flex-none rounded-full"
                    style={{ background: "#e24b4a" }}
                    aria-label="unread"
                  />
                )}
                <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[13.5px] font-semibold">
                  {c.client}
                </div>
              </div>
              <div
                className="flex-none rounded-[5px] px-[5px] py-[2px] font-mono text-[9px] text-white"
                style={{ letterSpacing: "0.06em", background: c.dotColor }}
              >
                {c.bandLabel}
              </div>
            </div>
            <div className="mt-[2px] text-[11.5px]" style={{ color: "oklch(0.556 0 0)" }}>
              {c.sector} · {c.domicile}
            </div>
            <div className="mt-[9px] flex items-center justify-between gap-2">
              <div
                className="inline-block rounded-full border px-[9px] py-[2px] text-[11px]"
                style={{ background: c.pillBg, color: c.pillColor, borderColor: c.pillBorder }}
              >
                {c.pillText}
              </div>
              <div className="font-mono text-[9.5px]" style={{ color: "oklch(0.55 0 0)" }}>
                MAT {c.materiality}
              </div>
            </div>
          </button>
        ))}
        {view.listEmpty && (
          <div
            className="m-[18px_10px] rounded-[10px] border border-dashed p-[18px] text-center text-xs"
            style={{ borderColor: "oklch(0.86 0 0)", color: "oklch(0.6 0 0)" }}
          >
            {view.listEmptyText}
          </div>
        )}
      </div>
    </div>
  );
}
