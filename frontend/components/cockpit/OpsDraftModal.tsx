"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export interface OpsDraftContext {
  client: string;
  // The classification Compliance recommends Operations apply, e.g. "HIGH".
  recommendedBand: string;
  // The cited top reason for the recommendation.
  topReason: string;
}

export interface OpsDraftModalProps {
  open: boolean;
  context: OpsDraftContext;
  onSend: (message: string) => void;
  onClose: () => void;
}

// Build the prefilled draft. Frames the message as a recommendation; Operations
// performs the documented change, Compliance does not apply it here.
function draftFor(ctx: OpsDraftContext): string {
  return [
    `To: Operations`,
    `Re: ${ctx.client} - recommended risk reclassification`,
    ``,
    `Compliance recommends reclassifying ${ctx.client} to ${ctx.recommendedBand} risk.`,
    `Top reason: ${ctx.topReason}`,
    ``,
    `Please review and apply the reclassification in the system of record, then confirm back to Compliance. This message is a recommendation; Operations performs the documented change.`,
  ].join("\n");
}

// A self-contained portal modal (no dialog library) for drafting a recommendation
// to Operations. State is local; the draft is prefilled and editable, then sent.
export function OpsDraftModal({ open, context, onSend, onClose }: OpsDraftModalProps) {
  const [message, setMessage] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Refill the draft each time the modal opens, so it reflects the current case.
  useEffect(() => {
    if (open) setMessage(draftFor(context));
  }, [open, context]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Draft message to Operations"
        className="w-full max-w-lg rounded-xl border bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="m-0 text-[16px] font-semibold" style={{ color: "oklch(0.2 0 0)" }}>
          Draft message to Operations
        </h3>
        <p className="mt-1 text-[12.5px] leading-[1.5]" style={{ color: "oklch(0.45 0 0)" }}>
          This recommends a reclassification; it does not change the case here. Operations performs
          the documented change and confirms back to Compliance.
        </p>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="mt-3 min-h-[160px] w-full resize-y rounded-[9px] border bg-white p-[10px_12px] font-mono text-[12px] outline-none"
          style={{ borderColor: "oklch(0.9 0 0)", color: "oklch(0.205 0 0)" }}
          aria-label="Draft message"
        />
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg border px-4 py-2 text-[12.5px] font-medium"
            style={{ borderColor: "oklch(0.88 0 0)", color: "oklch(0.4 0 0)", background: "#fff" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSend(message)}
            className="dw-dark-hover cursor-pointer rounded-lg border-none px-4 py-2 text-[12.5px] font-medium text-white"
            style={{ background: "oklch(0.205 0 0)" }}
          >
            Send
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
