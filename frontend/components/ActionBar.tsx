"use client";

import { useState } from "react";
import { RecommendedAction } from "@/lib/api";
import { decide as decideAlert } from "@/lib/data";
import { Button } from "@/components/ui/button";

const ACTIONS: {
  label: string;
  action: RecommendedAction;
  variant: "default" | "brand" | "outline";
}[] = [
  { label: "Approve Re-KYC", action: "re_kyc", variant: "default" },
  { label: "Escalate to MLRO", action: "escalate", variant: "brand" },
  { label: "Dismiss as false positive", action: "no_change", variant: "outline" },
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
      await decideAlert(alertId, action);
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
        <Button
          key={a.action}
          variant={a.variant}
          size="lg"
          onClick={() => decide(a.action)}
          disabled={busy !== null}
        >
          {busy === a.action ? "Saving..." : a.label}
        </Button>
      ))}
      {error && <span className="text-sm text-destructive">{error}</span>}
    </section>
  );
}
