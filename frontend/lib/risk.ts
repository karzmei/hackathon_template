import type { SeverityTone } from "@/components/ui/severity-badge";
import type { RiskBandLevel } from "@/lib/api";

// KYC risk band -> semantic status tone. low -> green, medium -> amber, high -> red.
export function bandTone(band: RiskBandLevel): SeverityTone {
  if (band === "high") return "danger";
  if (band === "medium") return "warning";
  return "success";
}

// Semantic tone from a textual risk band ("MEDIUM -> HIGH"); only the words matter.
export function bandTextTone(riskBand: string): SeverityTone {
  if (riskBand.includes("HIGH")) return "danger";
  if (riskBand.includes("MEDIUM")) return "warning";
  return "success";
}

// Left-edge accent colour for a card, keyed by semantic tone.
export function toneToAccentVar(tone: SeverityTone): string {
  if (tone === "danger") return "var(--color-border-danger)";
  if (tone === "warning") return "var(--color-border-warning)";
  return "var(--color-border-success)";
}

// Left-edge accent colour from the textual risk band ("MEDIUM -> HIGH").
export function bandAccentVar(riskBand: string): string {
  return toneToAccentVar(bandTextTone(riskBand));
}
