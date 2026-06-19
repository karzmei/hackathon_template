import { ArrowRight } from "lucide-react";
import { Owner, Profile } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function ownersLabel(owners: Owner[]): string {
  const unscreened = owners.filter((o) => !o.screened).length;
  const suffix = unscreened ? ` (${unscreened} unscreened)` : "";
  return `${owners.length} owners${suffix}`;
}

function Row({ label, from, to }: { label: string; from: string; to: string }) {
  const changed = from !== to;
  return (
    <div className="grid grid-cols-[10rem_1fr_auto_1fr] items-center gap-2 border-b py-2 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm">{from}</span>
      <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden />
      <span
        className={cn(
          "text-sm",
          changed ? "font-semibold text-foreground" : "text-muted-foreground"
        )}
      >
        {to}
      </span>
    </div>
  );
}

// Makes KYC drift legible at a glance: baseline -> current per dimension.
export function BaselineVsCurrent({
  baseline,
  current,
}: {
  baseline: Profile;
  current: Profile;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif text-lg">Baseline vs current</CardTitle>
      </CardHeader>
      <CardContent>
        <Row label="Business model" from={baseline.business_model} to={current.business_model} />
        <Row label="Legal form" from={baseline.legal_form} to={current.legal_form} />
        <Row label="Ownership" from={ownersLabel(baseline.owners)} to={ownersLabel(current.owners)} />
        <Row label="Expected volume" from={baseline.expected_volume_band} to={current.expected_volume_band} />
        <Row label="Domain" from={baseline.domain} to={current.domain} />
        <Row label="Risk rating" from={baseline.risk_rating} to={current.risk_rating} />
      </CardContent>
    </Card>
  );
}
