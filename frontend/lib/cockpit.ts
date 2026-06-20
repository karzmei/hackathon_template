// View-model helpers for the cockpit. Pure functions over the API shapes so the
// presentation logic stays testable and the components stay declarative.

import type { DriftScore, RiskBandLevel } from "@/lib/api";
import type { SeverityTone } from "@/components/ui/severity-badge";
import { bandTone, toneToAccentVar } from "@/lib/risk";

// Analysis depth (1..3) -> the cascade label shown on queue rows and chips.
export function depthLabel(depth: number): string {
  if (depth >= 3) return "DEEP";
  if (depth === 2) return "STD";
  return "FAST";
}

// Signal confidence -> badge tone. High-confidence (>= 0.75) reads green, the rest amber.
export function confTone(confidence: number): Extract<SeverityTone, "success" | "warning"> {
  return confidence >= 0.75 ? "success" : "warning";
}

// Marker position (0..100) on the LOW/MEDIUM/HIGH gradient for an aggregate 0..1 score.
export function markerPct(aggregate: number): number {
  return Math.min(100, Math.max(0, Math.round(aggregate * 100)));
}

// Textual risk band ("MEDIUM -> HIGH") -> the level that drives colour.
export function bandLevelFromText(riskBand: string): RiskBandLevel {
  if (riskBand.includes("HIGH")) return "high";
  if (riskBand.includes("MEDIUM")) return "medium";
  return "low";
}

// Risk level -> the semantic accent colour CSS variable (low green, medium amber, high red).
export function levelColor(level: RiskBandLevel): string {
  return toneToAccentVar(bandTone(level));
}

// Normalise sparkline values (0..1) to bar heights in percent, with a visible floor.
export function sparkHeights(values: number[], min = 8): number[] {
  return values.map((v) =>
    Math.max(min, Math.round(Math.min(1, Math.max(0, v)) * 100)),
  );
}

// Queue drift badge, e.g. "81%" trending up or "-6%" trending down.
export function driftPctLabel(
  sparkline: number[],
  trend: "up" | "down" | "flat",
): string {
  if (sparkline.length === 0) return "0%";
  const avg = sparkline.reduce((a, b) => a + b, 0) / sparkline.length;
  const pct = Math.round(avg * 100);
  return (trend === "down" ? "-" : "") + pct + "%";
}

export interface DimensionRow {
  dimension: string;
  from: string;
  to: string;
  pct: string; // "95%"
  width: string; // bar width, floored so a thin sliver stays visible
  level: RiskBandLevel; // colour band derived from the delta
  changed: boolean;
}

// Delta magnitude (0..1) -> colour band for the dimension bar.
function deltaLevel(delta: number): RiskBandLevel {
  if (delta >= 0.7) return "high";
  if (delta >= 0.4) return "medium";
  return "low";
}

// Per-dimension drift rows for the "baseline -> current" list.
export function dimensionRows(drift: DriftScore): DimensionRow[] {
  return drift.per_dimension.map((d) => ({
    dimension: d.dimension,
    from: d.from,
    to: d.to,
    pct: `${Math.round(d.delta * 100)}%`,
    width: `${Math.max(5, Math.round(d.delta * 100))}%`,
    level: deltaLevel(d.delta),
    changed: d.delta > 0,
  }));
}
