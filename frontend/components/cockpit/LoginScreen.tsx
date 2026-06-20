"use client";

import Link from "next/link";
import { ROLES, type Role } from "@/lib/cockpit-types";

// The three seats, with the copy from the prototype. line2 marks the line of defence.
const SEATS: { role: Role; lineLabel: string; blurb: string }[] = [
  {
    role: "rm",
    lineLabel: "1ST LINE",
    blurb:
      "My book. What changed overnight, ranked. Escalate up to Compliance, or hand a client over to the Account Manager.",
  },
  {
    role: "am",
    lineLabel: "1ST LINE",
    blurb:
      "The complex accounts. Structure, ownership and exposure shifts. Escalate up to Compliance, or hand a client back to the RM.",
  },
  {
    role: "compliance",
    lineLabel: "2ND LINE · CONTROL",
    blurb:
      "Escalations from the first line, each with a recommended decision. Send instructions back down, or escalate up to the MLRO.",
  },
];

export function LoginScreen({ onPick }: { onPick: (role: Role) => void }) {
  return (
    <div
      className="flex flex-1 flex-col items-center justify-center overflow-y-auto p-8 text-center"
      style={{ background: "oklch(0.97 0 0)" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static brand mark, no optimisation needed */}
      <img src="/driftwatch-icon.svg" alt="" className="mb-3 h-14 w-14" />
      <div className="font-mono text-[13px] font-medium" style={{ letterSpacing: "0.30em", color: "oklch(0.205 0 0)" }}>
        DRIFTWATCH
      </div>
      <div className="mt-[7px] font-mono text-[10.5px]" style={{ letterSpacing: "0.22em", color: "oklch(0.556 0 0)" }}>
        AMINA · KYC DRIFT COCKPIT
      </div>
      <h1 className="mb-[6px] mt-7 text-[31px] font-semibold" style={{ letterSpacing: "-0.02em" }}>
        Select your role
      </h1>
      <p className="mb-3 mt-0 max-w-[520px] text-sm leading-relaxed" style={{ color: "oklch(0.556 0 0)" }}>
        Choose your seat to open your queue. Relationship Manager and Account Manager are the{" "}
        <b style={{ color: "oklch(0.35 0 0)" }}>first line</b> who own the client; Compliance is the{" "}
        <b style={{ color: "oklch(0.35 0 0)" }}>second line</b> control; the{" "}
        <b style={{ color: "oklch(0.35 0 0)" }}>MLRO</b> is the third line that owns the regulatory
        reporting decision. Flags go up; instructions come back down.
      </p>
      <div
        className="my-[14px] flex flex-wrap items-center justify-center gap-[18px] font-mono text-[10px]"
        style={{ letterSpacing: "0.1em", color: "oklch(0.5 0 0)" }}
      >
        <span className="rounded-full px-[11px] py-1" style={{ background: "#e0ebff", color: "#1e3a8a" }}>
          1ST LINE · BUSINESS
        </span>
        <span className="self-center" style={{ color: "oklch(0.7 0 0)" }}>
          &rarr; escalate &rarr;
        </span>
        <span className="rounded-full px-[11px] py-1" style={{ background: "#fcebeb", color: "#501313" }}>
          2ND LINE · CONTROL
        </span>
        <span className="self-center" style={{ color: "oklch(0.7 0 0)" }}>
          &rarr; escalate &rarr;
        </span>
        <span className="rounded-full px-[11px] py-1" style={{ background: "#ece9fb", color: "#312461" }}>
          3RD LINE · MLRO
        </span>
      </div>
      <div className="flex max-w-[1000px] flex-wrap justify-center gap-5">
        {SEATS.map(({ role, lineLabel, blurb }) => {
          const r = ROLES[role];
          return (
            <button
              key={role}
              onClick={() => onPick(role)}
              className="dw-card-hover flex w-[300px] cursor-pointer flex-col gap-[13px] rounded-[14px] border bg-white p-6 text-left"
              style={{ borderColor: "oklch(0.922 0 0)", boxShadow: "0 1px 2px rgba(0,0,0,.04)" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-full text-[15px] font-semibold"
                  style={{ background: r.avBg, color: r.avColor }}
                >
                  {r.avatar}
                </div>
                <div>
                  <div className="text-[15px] font-semibold">{r.name}</div>
                  <div className="text-[12.5px]" style={{ color: "oklch(0.556 0 0)" }}>
                    {r.title}
                  </div>
                </div>
              </div>
              <div
                className="self-start rounded-[5px] px-[7px] py-[2px] font-mono text-[9px]"
                style={{ letterSpacing: "0.1em", color: r.avColor, background: r.avBg }}
              >
                {lineLabel}
              </div>
              <div className="text-[13px] leading-relaxed" style={{ color: "oklch(0.42 0 0)" }}>
                {blurb}
              </div>
              <div className="font-mono text-[10.5px]" style={{ letterSpacing: "0.14em", color: "oklch(0.205 0 0)" }}>
                ENTER &rarr;
              </div>
            </button>
          );
        })}
      </div>
      <Link
        href="/dashboard"
        className="mt-[26px] rounded-full border bg-white px-[14px] py-[6px] font-mono text-[10px]"
        style={{ letterSpacing: "0.14em", color: "oklch(0.4 0 0)", borderColor: "oklch(0.88 0 0)" }}
      >
        COST &amp; EFFICIENCY DASHBOARD &rarr;
      </Link>
      <div
        className="mt-[16px] flex items-center gap-[7px] font-mono text-[10px]"
        style={{ letterSpacing: "0.16em", color: "oklch(0.6 0 0)" }}
      >
        <span
          className="dw-pulse inline-block h-[6px] w-[6px] rounded-full"
          style={{ background: "#97c459" }}
          aria-hidden="true"
        />
        LIVE · CASES SYNC ACROSS THE TEAM IN REAL TIME
      </div>
    </div>
  );
}
