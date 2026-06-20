import { SeverityBadge } from "driftwatch-frontend";
import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from "lucide-react";

export function Tones() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", padding: 16 }}>
      <SeverityBadge tone="success" label="LOW" />
      <SeverityBadge tone="warning" label="MEDIUM" />
      <SeverityBadge tone="danger" label="HIGH" />
      <SeverityBadge tone="info" label="In review" />
      <SeverityBadge tone="neutral" label="No change" />
    </div>
  );
}

export function WithIcons() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", padding: 16 }}>
      <SeverityBadge tone="danger" label="HIGH risk" icon={ShieldAlert} />
      <SeverityBadge tone="warning" label="Re-KYC required" icon={AlertTriangle} />
      <SeverityBadge tone="success" label="Cleared" icon={CheckCircle2} />
      <SeverityBadge tone="info" label="Escalated by AM" icon={Info} />
    </div>
  );
}

export function Sizes() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", padding: 16 }}>
      <SeverityBadge tone="danger" label="HIGH" icon={ShieldAlert} size="sm" />
      <SeverityBadge tone="danger" label="HIGH" icon={ShieldAlert} size="md" />
    </div>
  );
}
