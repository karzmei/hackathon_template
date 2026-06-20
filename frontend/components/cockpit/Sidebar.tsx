"use client";

import type { NavItemVM } from "@/lib/cockpit-view";

// Left rail: role-specific navigation, the two lines-of-defence legend, and a note
// that case state is shared across windows. Nav is display-only in the prototype.
export function Sidebar({ nav }: { nav: NavItemVM[] }) {
  return (
    <div
      className="flex w-[212px] flex-none flex-col gap-[3px] border-r p-[16px_12px]"
      style={{ borderColor: "oklch(0.922 0 0)", background: "oklch(0.985 0 0)" }}
    >
      <div className="px-2 pb-2 pt-1 font-mono text-[9.5px]" style={{ letterSpacing: "0.16em", color: "oklch(0.6 0 0)" }}>
        NAVIGATION
      </div>
      {nav.map((n) => (
        <div
          key={n.label}
          className="flex items-center justify-between rounded-lg px-[10px] py-[9px] text-[13px]"
          style={{ background: n.bg, border: n.border, fontWeight: n.weight, color: n.color }}
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
        className="px-2 pb-[2px] pt-[10px] font-mono text-[9px] leading-[1.6]"
        style={{ letterSpacing: "0.1em", color: "oklch(0.68 0 0)" }}
      >
        SHARED CASE STATE
        <br />
        SYNCS ACROSS WINDOWS
      </div>
    </div>
  );
}
