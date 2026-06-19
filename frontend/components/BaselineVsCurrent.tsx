import { Owner, Profile } from "@/lib/api";

function ownersLabel(owners: Owner[]): string {
  const unscreened = owners.filter((o) => !o.screened).length;
  const suffix = unscreened ? ` (${unscreened} unscreened)` : "";
  return `${owners.length} owners${suffix}`;
}

function Row({ label, from, to }: { label: string; from: string; to: string }) {
  const changed = from !== to;
  return (
    <div className="grid grid-cols-[10rem_1fr_auto_1fr] items-center gap-2 py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm">{from}</span>
      <span className="text-slate-400">{"→"}</span>
      <span className={`text-sm ${changed ? "font-semibold text-navy" : "text-slate-500"}`}>
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
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="font-serif text-lg text-navy mb-2">Baseline vs current</h3>
      <Row label="Business model" from={baseline.business_model} to={current.business_model} />
      <Row label="Legal form" from={baseline.legal_form} to={current.legal_form} />
      <Row label="Ownership" from={ownersLabel(baseline.owners)} to={ownersLabel(current.owners)} />
      <Row label="Expected volume" from={baseline.expected_volume_band} to={current.expected_volume_band} />
      <Row label="Domain" from={baseline.domain} to={current.domain} />
      <Row label="Risk rating" from={baseline.risk_rating} to={current.risk_rating} />
    </section>
  );
}
