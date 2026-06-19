import { AlertStatus } from "@/lib/api";
import { SeverityBadge, type SeverityTone } from "@/components/ui/severity-badge";

const META: Record<AlertStatus, { label: string; tone: SeverityTone }> = {
  new: { label: "New", tone: "neutral" },
  needs_review: { label: "Needs review", tone: "warning" },
  escalated: { label: "Escalated", tone: "danger" },
  dismissed: { label: "Dismissed", tone: "neutral" },
  actioned: { label: "Actioned", tone: "success" },
};

export function StatusPill({ status }: { status: AlertStatus }) {
  const { label, tone } = META[status];
  return <SeverityBadge tone={tone} label={label} size="sm" />;
}
