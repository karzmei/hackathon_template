"use client";

import type { NavItemVM } from "@/lib/cockpit-view";

// Left rail: a read-only overview of the role's caseload counts, the two lines-of-defence
// legend, and a live-sync presence indicator. The overview is informative only; it is
// intentionally flat (not a clickable nav).
export function Sidebar({ nav }: { nav: NavItemVM[] }) {
  return (
    <div
      className="flex w-[212px] flex-none flex-col gap-[1px] border-r p-[16px_12px]"
      style={{ borderColor: "oklch(0.922 0 0)", background: "oklch(0.985 0 0)" }}
    >
      <div className="px-2 pb-2 pt-1 font-mono text-[9.5px]" style={{ letterSpacing: "0.16em", color: "oklch(0.6 0 0)" }}>
        OVERVIEW
      </div>
      {nav.map((n) => (
        <div
          key={n.label}
          className="flex select-none items-center justify-between px-[10px] py-[5px] text-[13px]"
          style={{ color: "oklch(0.45 0 0)" }}
        >
          <span>{n.label}</span>
          {n.hasCount && (
            <span
              className="rounded-full px-[7px] py-[1px] font-mono text-[10px]"
              style={{ background: n.countBg, color: n.countColor }}
            >
              {n.count}
            </span>
          )}
        </div>
      ))}
      <div className="flex-1" />
      <div className="border-t px-2 pb-1 pt-3" style={{ borderColor: "oklch(0.93 0 0)" }}>
        <div className="mb-[7px] font-mono text-[9px]" style={{ letterSpacing: "0.1em", color: "oklch(0.55 0 0)" }}>
          LINES OF DEFENCE
        </div>
        <div className="mb-[5px] flex items-center gap-[7px]">
          <span className="h-2 w-2 rounded-[2px]" style={{ background: "#4f7ce6" }} />
          <span className="text-[11px]" style={{ color: "oklch(0.45 0 0)" }}>
            1st · RM + AM (business)
          </span>
        </div>
        <div className="flex items-center gap-[7px]">
          <span className="h-2 w-2 rounded-[2px]" style={{ background: "#e24b4a" }} />
          <span className="text-[11px]" style={{ color: "oklch(0.45 0 0)" }}>
            2nd · Compliance (control)
          </span>
        </div>
      </div>
      <div
        className="flex items-center gap-[7px] px-2 pb-[2px] pt-[10px] font-mono text-[9px]"
        style={{ letterSpacing: "0.1em", color: "oklch(0.6 0 0)" }}
      >
        <span
          className="dw-pulse inline-block h-[6px] w-[6px] rounded-full"
          style={{ background: "#97c459" }}
          aria-hidden="true"
        />
        LIVE · SYNCED ACROSS THE TEAM
      </div>
    </div>
  );
}
