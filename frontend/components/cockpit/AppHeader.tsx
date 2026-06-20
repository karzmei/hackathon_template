"use client";

import Link from "next/link";
import type { CockpitView } from "@/lib/cockpit-view";

// Top chrome: brand, the Compliance inbox pill (with unread pulse), the role badge
// and avatar, and a "switch role" control that returns to the seat picker.
export function AppHeader({ view, onLogout }: { view: CockpitView; onLogout: () => void }) {
  return (
    <div
      className="flex h-14 flex-none items-center justify-between border-b bg-white px-[18px]"
      style={{ borderColor: "oklch(0.922 0 0)" }}
    >
      <button
        type="button"
        onClick={onLogout}
        aria-label="DRIFTWATCH home"
        className="flex cursor-pointer items-center gap-[11px]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static brand mark, no optimisation needed */}
        <img src="/driftwatch-icon-compact.svg" alt="" className="h-7 w-7" />
        <div className="font-mono text-xs font-medium" style={{ letterSpacing: "0.26em" }}>
          DRIFTWATCH
        </div>
        <div
          className="border-l pl-[11px] font-mono text-[9.5px]"
          style={{ letterSpacing: "0.16em", color: "oklch(0.6 0 0)", borderColor: "oklch(0.9 0 0)" }}
        >
          COCKPIT
        </div>
      </button>
      <div className="flex items-center gap-[14px]">
        {view.isCompliance && (
          <div className="flex items-center gap-[7px] text-[12.5px]" style={{ color: "oklch(0.42 0 0)" }}>
            {view.hasInboxUnread && (
              <span
                className="dw-pulse inline-block h-[7px] w-[7px] rounded-full"
                style={{ background: "#e24b4a" }}
                aria-label="unread escalations"
              />
            )}
            Inbox{" "}
            {/* Plain numeral, not a badge: this is a read-only count; the pulse above carries the
                unread-attention cue. */}
            <span className="font-mono text-[12px] font-medium tabular-nums" style={{ color: "oklch(0.3 0 0)" }}>
              {view.inboxCount}
            </span>
          </div>
        )}
        <div
          className="rounded-full px-[9px] py-[3px] font-mono text-[9px]"
          style={{ letterSpacing: "0.1em", color: view.roleLineColor, background: view.roleLineBg }}
        >
          {view.roleLine}
        </div>
        <div className="flex items-center gap-[9px]">
          <div
            className="flex h-[30px] w-[30px] items-center justify-center rounded-full text-[11.5px] font-semibold"
            style={{ background: view.roleAvBg, color: view.roleAvColor }}
          >
            {view.roleAvatar}
          </div>
          <div className="leading-[1.15]">
            <div className="text-[13px] font-semibold">{view.roleName}</div>
            <div className="text-[11px]" style={{ color: "oklch(0.556 0 0)" }}>
              {view.roleTitle}
            </div>
          </div>
        </div>
        <Link
          href="/dashboard"
          className="cursor-pointer rounded-lg border bg-white px-[11px] py-[7px] font-mono text-[10px]"
          style={{ letterSpacing: "0.12em", color: "oklch(0.5 0 0)", borderColor: "oklch(0.9 0 0)" }}
        >
          COST
        </Link>
        <button
          onClick={onLogout}
          className="cursor-pointer rounded-lg border bg-white px-[11px] py-[7px] font-mono text-[10px]"
          style={{ letterSpacing: "0.12em", color: "oklch(0.5 0 0)", borderColor: "oklch(0.9 0 0)" }}
        >
          SWITCH ROLE
        </button>
      </div>
    </div>
  );
}
