import type { SeverityTone } from "@/components/ui/severity-badge";
import type { RiskBandLevel } from "@/lib/api";

// KYC risk band -> semantic status tone. low -> green, medium -> amber, high -> red.
export function bandTone(band: RiskBandLevel): SeverityTone {
  if (band === "high") return "danger";
  if (band === "medium") return "warning";
  return "success";
}

// Left-edge accent colour for a queue card, from the textual risk band ("MEDIUM -> HIGH").
export function bandAccentVar(riskBand: string): string {
  if (riskBand.includes("HIGH")) return "var(--color-border-danger)";
  if (riskBand.includes("MEDIUM")) return "var(--color-border-warning)";
  return "var(--color-border-success)";
}
