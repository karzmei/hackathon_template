"use client";

import { ArrowDown, ArrowRight, ArrowUp, Check, Flag, type LucideIcon } from "lucide-react";

import type { Role } from "@/lib/cockpit-types";
import type { DetailVM, RecipientVM } from "@/lib/cockpit-view";

const KICKER = "font-mono text-[10px]";
const KICKER_STYLE = { letterSpacing: "0.14em", color: "oklch(0.5 0 0)" } as const;

// Action icon by button key; reinforces the case-flow metaphor (up = escalate,
// sideways = handover, down = back to 1st line) and marks these as buttons, not tags.
const ACTION_ICON: Record<string, LucideIcon> = {
  escalate: ArrowUp,
  mlro: ArrowUp,
  handover: ArrowRight,
  handback: ArrowRight,
  re_kyc: ArrowDown,
  doc_request: ArrowDown,
  watchlist: Flag,
  reviewed: Check,
  dismiss: Check,
};

export interface CaseDetailProps {
  detail: DetailVM;
  recipients: RecipientVM[];
  msgDraft: string;
  msgPlaceholder: string;
  onAction: (key: string) => void;
  onConfirmInstruction: () => void;
  onPickRecipient: (role: Role) => void;
  onMsgChange: (value: string) => void;
  onSend: () => void;
}

// The case file. Sections render in the required order: risk delta + what it implies,
// drift signals, the source-cited "what changed" timeline, key facts, the
// recommendation, the instruction-back-down flow, the decision actions, the case
// conversation, and the append-only audit trail.
export function CaseDetail({
  detail: d,
  recipients,
  msgDraft,
  msgPlaceholder,
  onAction,
  onConfirmInstruction,
  onPickRecipient,
  onMsgChange,
  onSend,
}: CaseDetailProps) {
  return (
    <div className="p-[24px_28px_48px]" style={{ maxWidth: 760 }}>
      {/* Header: client, identifiers, risk delta */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="m-0 text-[23px] font-semibold" style={{ letterSpacing: "-0.01em" }}>
            {d.client}
          </h2>
          <div className="mt-[5px] font-mono text-[10.5px]" style={{ color: "oklch(0.556 0 0)" }}>
            LEI {d.lei} · {d.sector} · {d.domicile}
          </div>
        </div>
        <div className="flex flex-none items-center gap-2">
          {d.showDelta && (
            <>
              <span className="font-mono text-[10px] line-through" style={{ color: "oklch(0.62 0 0)" }}>
                {d.prevBand}
              </span>
              <span className="text-xs" style={{ color: "oklch(0.62 0 0)" }}>
                &rarr;
              </span>
            </>
          )}
          <span
            className="cursor-default rounded-[7px] border px-[9px] py-1 font-mono text-[11.5px] font-semibold"
            style={{ background: d.bandBg, color: d.bandColor, borderColor: d.bandBorder }}
          >
            {d.band} RISK
          </span>
        </div>
      </div>

      <div className="mt-[13px] flex flex-wrap items-center gap-2">
        <span
          className="inline-block cursor-default rounded-full border px-3 py-[3px] text-xs"
          style={{ background: d.statusBg, color: d.statusColor, borderColor: d.statusBorder }}
        >
          {d.statusText}
        </span>
        <span
          className="cursor-default rounded-full border px-[9px] py-[3px] font-mono text-[10px]"
          style={{ color: "oklch(0.5 0 0)", background: "oklch(0.96 0 0)", borderColor: "oklch(0.92 0 0)" }}
        >
          Owner · {d.ownerLabel}
        </span>
      </div>

      <div className="mt-[18px] font-serif text-[17px] leading-[1.45]" style={{ color: "oklch(0.25 0 0)" }}>
        {d.headline}
      </div>

      {/* Drift signals */}
      <div className="mt-6 flex items-baseline justify-between">
        <div className={KICKER} style={KICKER_STYLE}>
          DRIFT SIGNALS
        </div>
        <div className="font-mono text-[10px]" style={{ color: "oklch(0.5 0 0)" }}>
          MATERIALITY{" "}
          <b style={{ color: "oklch(0.2 0 0)", fontSize: 13 }}>{d.materiality}</b>/100
        </div>
      </div>
      <div className="mt-[9px] flex h-[7px] overflow-hidden rounded-[4px]" style={{ background: "oklch(0.93 0 0)" }}>
        <div className="dw-bar rounded-[4px]" style={{ width: d.matPct, background: d.bandBorder }} />
      </div>
      <div className="mt-[13px] flex flex-col gap-[7px]">
        {d.signals.map((s) => (
          <div key={s.label} className="flex items-center gap-[10px]">
            <div className="flex-1 text-[12.5px]" style={{ color: s.textColor }}>
              {s.label}
            </div>
            <div
              className="h-[6px] w-[118px] flex-none overflow-hidden rounded-[3px]"
              style={{ background: "oklch(0.95 0 0)" }}
            >
              <div className="dw-bar h-full" style={{ width: s.pct, background: s.barColor }} />
            </div>
            <div className="w-[30px] flex-none text-right font-mono text-[11px]" style={{ color: "oklch(0.45 0 0)" }}>
              +{s.pts}
            </div>
          </div>
        ))}
        {d.signalsEmpty && (
          <div className="text-xs" style={{ color: "oklch(0.6 0 0)" }}>
            No drift signals detected.
          </div>
        )}
      </div>

      {/* What changed (source-cited timeline) */}
      <div className={`mt-6 ${KICKER}`} style={KICKER_STYLE}>
        WHAT CHANGED
      </div>
      <div className="mt-[11px] flex flex-col gap-[11px]">
        {d.changes.map((ch, i) => (
          <div key={i} className="flex items-start gap-[11px]">
            <div className="mt-[6px] h-[7px] w-[7px] flex-none rounded-full" style={{ background: ch.dot }} />
            <div>
              <div className="text-[13.5px] leading-[1.45]" style={{ color: ch.textColor }}>
                {ch.text}
              </div>
              <div className="mt-[3px] font-mono text-[10px]" style={{ color: "oklch(0.6 0 0)" }}>
                {ch.src}
              </div>
            </div>
          </div>
        ))}
        {d.changesEmpty && (
          <div className="text-xs" style={{ color: "oklch(0.6 0 0)" }}>
            No changes recorded.
          </div>
        )}
      </div>

      {/* Key facts */}
      <div className={`mt-6 ${KICKER}`} style={KICKER_STYLE}>
        KEY FACTS
      </div>
      <div className="mt-[11px] grid grid-cols-2 gap-2">
        {d.facts.map((f) => (
          <div
            key={f}
            className="cursor-default rounded-lg border px-[11px] py-2 text-[12.5px]"
            style={{ color: "oklch(0.35 0 0)", background: "oklch(0.97 0 0)", borderColor: "oklch(0.93 0 0)" }}
          >
            {f}
          </div>
        ))}
        {d.factsEmpty && (
          <div className="text-xs" style={{ color: "oklch(0.6 0 0)" }}>
            No key facts on file.
          </div>
        )}
      </div>

      {/* Recommendation: live for the owner who can act, greyed context otherwise */}
      {d.rec.has && (
        <div
          className="mt-6 rounded-[12px] border p-[16px_18px]"
          style={
            d.rec.mode === "context"
              ? { borderColor: "oklch(0.9 0 0)", background: "oklch(0.975 0 0)" }
              : { borderColor: d.rec.border, background: d.rec.bg }
          }
        >
          <div className="flex items-center gap-2">
            <div className={KICKER} style={KICKER_STYLE}>
              {d.rec.kicker ?? "RECOMMENDED"}
            </div>
            <div
              className="cursor-default rounded-[5px] px-[7px] py-[2px] font-mono text-[9px]"
              style={
                d.rec.mode === "context"
                  ? { letterSpacing: "0.08em", color: "oklch(0.45 0 0)", background: "oklch(0.94 0 0)" }
                  : { letterSpacing: "0.08em", color: d.rec.tagColor, background: d.rec.tagBg }
              }
            >
              {d.rec.direction}
            </div>
          </div>
          <div
            className="mt-[7px] text-base font-semibold"
            style={d.rec.mode === "context" ? { color: "oklch(0.45 0 0)" } : undefined}
          >
            {d.rec.label}
          </div>
          {d.rec.rationale && (
            <div className="mt-[5px] text-[13px] leading-[1.5]" style={{ color: "oklch(0.45 0 0)" }}>
              {d.rec.rationale}
            </div>
          )}
          {d.rec.mode === "context" && d.rec.contextNote && (
            <div className="mt-[8px] font-mono text-[10px]" style={{ letterSpacing: "0.04em", color: "oklch(0.55 0 0)" }}>
              {d.rec.contextNote}
            </div>
          )}
        </div>
      )}

      {/* Instruction back down (owner) */}
      {d.instructionPending && (
        <div className="mt-[22px] rounded-[12px] border p-[16px_18px]" style={{ borderColor: "#ef9f27", background: "#fdf6ea" }}>
          <div className="font-mono text-[9.5px]" style={{ letterSpacing: "0.12em", color: "#7a4f06" }}>
            INSTRUCTION FROM COMPLIANCE · 2ND &rarr; 1ST LINE
          </div>
          <div className="mt-[6px] text-[15px] font-semibold" style={{ color: "#412402" }}>
            {d.instructionLabel}
          </div>
          <div className="mt-1 text-[12.5px] leading-[1.5]" style={{ color: "#7a4f06" }}>
            {d.instructionDetail}
          </div>
          <button
            onClick={onConfirmInstruction}
            className="dw-amber-hover mt-3 cursor-pointer rounded-[9px] border-none px-4 py-[10px] text-[13px] font-medium text-white"
            style={{ background: "#412402" }}
          >
            {d.instructionCta}
          </button>
        </div>
      )}
      {d.instructionDone && (
        <div
          className="mt-[22px] rounded-[12px] border p-[13px_16px] text-[13px] font-medium"
          style={{ borderColor: "#97c459", background: "#f3f8ea", color: "#173404" }}
        >
          {d.instructionDoneText}
        </div>
      )}

      {/* Decision actions */}
      {d.hasActorButtons && (
        <div className="mt-6 border-t pt-[18px]" style={{ borderColor: "oklch(0.93 0 0)" }}>
          <div className={`mb-[11px] ${KICKER}`} style={KICKER_STYLE}>
            {d.actionHeading}
          </div>
          <div className="flex flex-wrap gap-[10px]">
            {d.actorButtons.map((b) => {
              const Icon = ACTION_ICON[b.key];
              return (
                <button
                  key={b.key}
                  onClick={() => onAction(b.key)}
                  className="dw-action flex cursor-pointer items-center gap-3 rounded-[10px] px-4 py-[11px]"
                  style={{ background: b.bg, color: b.color, border: b.border }}
                >
                  {Icon && <Icon size={15} strokeWidth={2} aria-hidden />}
                  <span className="flex flex-col items-start gap-[2px]">
                    <span className="text-[13px] font-medium">{b.label}</span>
                    <span className="font-mono text-[8.5px]" style={{ letterSpacing: "0.06em", color: b.subColor }}>
                      {b.sub}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Next step: explain the state when there is nothing to click yet */}
      {d.nextStep.show && (
        <div
          className="mt-6 rounded-[10px] border p-[13px_16px] text-[13px]"
          style={{ borderColor: "oklch(0.92 0 0)", background: "oklch(0.98 0 0)", color: "oklch(0.45 0 0)" }}
        >
          {d.nextStep.text}
        </div>
      )}

      {/* Decided banner */}
      {d.decidedBanner && (
        <div
          className="mt-[22px] rounded-[10px] border p-[13px_16px] text-[13.5px] font-medium"
          style={{ borderColor: d.outcomeBorder, background: d.outcomeBg, color: d.outcomeColor }}
        >
          Decided · {d.outcomeLabel}, written to audit log{d.outcomeTail}
        </div>
      )}

      {/* Case conversation */}
      <div className="mt-[26px] border-t pt-[18px]" style={{ borderColor: "oklch(0.922 0 0)" }}>
        <div className="flex items-center justify-between">
          <div className={KICKER} style={KICKER_STYLE}>
            CASE CONVERSATION
          </div>
          <div className="font-mono text-[9px]" style={{ color: "oklch(0.6 0 0)" }}>
            RM · AM · COMPLIANCE
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-[9px]">
          {d.thread.map((m, i) => (
            <div key={i} className="flex" style={{ justifyContent: m.align }}>
              <div
                className="rounded-[11px] border p-[9px_12px]"
                style={{ maxWidth: "78%", background: m.bubbleBg, borderColor: m.bubbleBorder }}
              >
                <div className="mb-[3px] flex items-center gap-[7px]">
                  <span
                    className="flex h-[17px] w-[17px] items-center justify-center rounded-full text-[8.5px] font-semibold"
                    style={{ background: m.avBg, color: m.avColor }}
                  >
                    {m.avatar}
                  </span>
                  <span className="text-[11px] font-semibold" style={{ color: "oklch(0.3 0 0)" }}>
                    {m.who}
                  </span>
                  <span className="font-mono text-[8.5px]" style={{ color: "oklch(0.6 0 0)" }}>
                    &rarr; {m.toLabel} · {m.ts}
                  </span>
                </div>
                <div className="text-[12.5px] leading-[1.45]" style={{ color: "oklch(0.25 0 0)" }}>
                  {m.text}
                </div>
              </div>
            </div>
          ))}
          {d.threadEmpty && (
            <div className="px-[2px] py-1 text-xs" style={{ color: "oklch(0.6 0 0)" }}>
              No messages yet. Start a conversation with the {d.peerHint}.
            </div>
          )}
        </div>

        <div
          className="mt-[13px] rounded-[11px] border p-[11px]"
          style={{ background: "oklch(0.98 0 0)", borderColor: "oklch(0.92 0 0)" }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px]" style={{ color: "oklch(0.5 0 0)" }}>
              To:
            </span>
            {recipients.map((r) => (
              <button
                key={r.key}
                onClick={() => onPickRecipient(r.key)}
                aria-pressed={r.active}
                className="flex cursor-pointer items-center gap-[6px] rounded-full px-[11px] py-1 text-[11.5px]"
                style={{ background: r.bg, color: r.color, border: r.border }}
              >
                <span
                  className="flex h-[14px] w-[14px] items-center justify-center rounded-full text-[8px] font-semibold"
                  style={{ background: r.avBg, color: r.avColor }}
                >
                  {r.avatar}
                </span>
                {r.label}
              </button>
            ))}
          </div>
          <textarea
            value={msgDraft}
            onChange={(e) => onMsgChange(e.target.value)}
            placeholder={msgPlaceholder}
            className="mt-[10px] min-h-[52px] w-full resize-y rounded-[9px] border bg-white p-[9px_11px] text-[12.5px] outline-none"
            style={{ borderColor: "oklch(0.9 0 0)", color: "oklch(0.205 0 0)" }}
          />
          <div className="mt-[9px] flex justify-end">
            <button
              onClick={onSend}
              className="dw-dark-hover cursor-pointer rounded-lg border-none px-4 py-2 text-[12.5px] font-medium text-white"
              style={{ background: "oklch(0.205 0 0)" }}
            >
              Send message
            </button>
          </div>
        </div>
      </div>

      {/* Audit trail */}
      <div className="mt-[26px] border-t pt-4" style={{ borderColor: "oklch(0.922 0 0)" }}>
        <div className={KICKER} style={KICKER_STYLE}>
          AUDIT TRAIL
        </div>
        <div className="mt-2">
          {d.audit.map((a, i) => (
            <div
              key={i}
              className="flex gap-3 border-b py-2"
              style={{ borderColor: "oklch(0.96 0 0)" }}
            >
              <div className="w-[92px] flex-none font-mono text-[10px]" style={{ color: "oklch(0.6 0 0)" }}>
                {a.ts}
              </div>
              <div className="text-[12.5px] leading-[1.4]">
                <span style={{ color: "oklch(0.45 0 0)" }}>{a.actor}</span> · {a.action}
              </div>
            </div>
          ))}
          {d.auditEmpty && (
            <div className="px-[2px] py-[6px] text-xs" style={{ color: "oklch(0.6 0 0)" }}>
              Nothing logged yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
