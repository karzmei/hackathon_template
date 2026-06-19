"use client";

import { useState } from "react";
import { api, RecommendedAction } from "@/lib/api";

const ACTIONS: { label: string; action: RecommendedAction; tone: string }[] = [
  { label: "Approve Re-KYC", action: "re_kyc", tone: "bg-navy text-cream" },
  { label: "Escalate to MLRO", action: "escalate", tone: "bg-gold text-navy" },
  { label: "Dismiss as false positive", action: "no_change", tone: "bg-white text-ink border border-slate-300" },
];

// Human-in-the-loop: the AI proposes, the human disposes. Three actions only.
export function ActionBar({
  alertId,
  onDecided,
}: {
  alertId: string;
  onDecided: () => void;
}) {
  const [busy, setBusy] = useState<RecommendedAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(action: RecommendedAction) {
    setBusy(action);
    setError(null);
    try {
      await api.decide(alertId, action);
      onDecided();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Decision failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="flex flex-wrap items-center gap-3">
      {ACTIONS.map((a) => (
        <button
          key={a.action}
          onClick={() => decide(a.action)}
          disabled={busy !== null}
          className={`rounded px-4 py-2 text-sm font-medium disabled:opacity-50 ${a.tone}`}
        >
          {busy === a.action ? "Saving..." : a.label}
        </button>
      ))}
      {error && <span className="text-sm text-red-600">{error}</span>}
    </section>
  );
}
