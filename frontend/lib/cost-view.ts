// Pure view-model helpers for the cost dashboard. No React, no formatting state;
// every function is a plain transform of the CostDashboard payload, so the logic is
// unit-testable without rendering (mirrors the cockpit-view.ts pattern).

import { TONES, type Tone, type ToneName } from "@/lib/cockpit-types";
import type { CostDashboard, StageCost, ClientCost } from "@/lib/api";

// USD spend is tiny per case, so show enough precision to stay non-zero. Sub-cent
// figures get four significant decimals; a cent or more gets the usual two.
export function formatUsd(usd: number): string {
  if (usd === 0) return "$0.00";
  if (usd < 0.01) return "$" + usd.toFixed(4);
  return "$" + usd.toFixed(2);
}

// Compact token counts: 9800 -> "9.8k", 750 -> "750".
export function formatTokens(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

export function formatPct(fraction: number): string {
  return Math.round(fraction * 100) + "%";
}

// Prompt vs completion split of the total token spend, as fractions that sum to 1.
export interface Composition {
  tokensIn: number;
  tokensOut: number;
  total: number;
  inFraction: number;
  outFraction: number;
}

export function compositionSplit(d: CostDashboard): Composition {
  const tokensIn = d.totals.tokens_in;
  const tokensOut = d.totals.tokens_out;
  const total = tokensIn + tokensOut;
  return {
    tokensIn,
    tokensOut,
    total,
    inFraction: total ? tokensIn / total : 0,
    outFraction: total ? tokensOut / total : 0,
  };
}

// Each stage rendered as a funnel row: its share of total spend (the bar width) and
// the volume it handled (entered) versus what it passed on (survived).
export interface StageBar {
  stage: StageCost["stage"];
  label: string;
  model: string | null;
  entered: number;
  survived: number;
  usd: number;
  usdPct: string; // share of total spend, for the bar width
  tone: ToneName; // rules -> success (cheap), reasoning -> warning, deep -> danger
  bg: string;
  border: string;
  text: string;
}

const STAGE_TONE: Record<StageCost["stage"], ToneName> = {
  rules: "success",
  reasoning: "warning",
  deep: "danger",
};

export function stageBars(d: CostDashboard): StageBar[] {
  const totalUsd = d.totals.usd;
  return d.by_stage.map((s) => {
    const tone = STAGE_TONE[s.stage];
    const t: Tone = TONES[tone];
    return {
      stage: s.stage,
      label: s.label,
      model: s.model,
      entered: s.entered,
      survived: s.survived,
      usd: s.usd,
      usdPct: totalUsd ? formatPct(s.usd / totalUsd) : "0%",
      tone,
      bg: t.bg,
      border: t.border,
      text: t.text,
    };
  });
}

// The model/tier split, derived from the LLM stages (rules has no model).
export interface ModelRow {
  model: string;
  label: string; // the stage that ran it
  tokensIn: number;
  tokensOut: number;
  usd: number;
  usdPct: string;
}

export function modelRows(d: CostDashboard): ModelRow[] {
  const totalUsd = d.totals.usd;
  return d.by_stage
    .filter((s) => s.model !== null)
    .map((s) => ({
      model: s.model as string,
      label: s.label,
      tokensIn: s.tokens_in,
      tokensOut: s.tokens_out,
      usd: s.usd,
      usdPct: totalUsd ? formatPct(s.usd / totalUsd) : "0%",
    }));
}

// Per-client rows, sorted by spend so the expensive cases lead. The band drives the
// risk pill tone, matching the cockpit colour language.
export interface ClientRow {
  clientId: string;
  clientName: string;
  depth: number;
  band: string;
  bandTone: ToneName;
  bandBg: string;
  bandBorder: string;
  bandText: string;
  tokensIn: number;
  tokensOut: number;
  usd: number;
  usdText: string;
}

function bandTone(band: string): ToneName {
  if (band === "high") return "danger";
  if (band === "medium") return "warning";
  return "success";
}

export function clientRows(d: CostDashboard): ClientRow[] {
  return d.by_client
    .slice()
    .sort((a: ClientCost, b: ClientCost) => b.usd - a.usd)
    .map((c) => {
      const tone = bandTone(c.band);
      const t = TONES[tone];
      return {
        clientId: c.client_id,
        clientName: c.client_name,
        depth: c.depth,
        band: c.band,
        bandTone: tone,
        bandBg: t.bg,
        bandBorder: t.border,
        bandText: t.text,
        tokensIn: c.tokens_in,
        tokensOut: c.tokens_out,
        usd: c.usd,
        usdText: formatUsd(c.usd),
      };
    });
}

// The headline efficiency framing: how concentrated spend is on the cases that
// became actionable, and how many were cleared cheaply at the rules stage.
export interface Efficiency {
  usdPerAlert: number;
  usdPerAlertText: string;
  actionableAlerts: number;
  usdPerActionable: number;
  usdPerActionableText: string;
  cheapExits: number;
  // Share of total spend that went to the deep (most expensive) stage; the headline
  // "spend lands where it matters" number.
  deepSpendShare: string;
}

export function efficiency(d: CostDashboard): Efficiency {
  const deep = d.by_stage.find((s) => s.stage === "deep");
  const deepShare = d.totals.usd && deep ? deep.usd / d.totals.usd : 0;
  return {
    usdPerAlert: d.usd_per_alert,
    usdPerAlertText: formatUsd(d.usd_per_alert),
    actionableAlerts: d.actionable_alerts,
    usdPerActionable: d.usd_per_actionable,
    usdPerActionableText: formatUsd(d.usd_per_actionable),
    cheapExits: d.cheap_exits,
    deepSpendShare: formatPct(deepShare),
  };
}
