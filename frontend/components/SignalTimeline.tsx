import { Signal } from "@/lib/api";

// What changed and when: newest-first, source-cited; every claim traces to an artifact.
export function SignalTimeline({ signals }: { signals: Signal[] }) {
  const ordered = [...signals].sort((a, b) =>
    b.observed_at.localeCompare(a.observed_at),
  );

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="font-serif text-lg text-navy mb-2">Source-cited timeline</h3>
      <ol className="space-y-3">
        {ordered.map((s) => (
          <li key={s.id} className="border-l-2 border-gold/60 pl-3">
            <div className="flex flex-wrap items-baseline gap-x-3 text-xs text-slate-500">
              <span className="font-semibold uppercase tracking-wide text-gold">
                {s.source}
              </span>
              <span>{s.observed_at}</span>
              <span>confidence {(s.confidence * 100).toFixed(0)}%</span>
            </div>
            <p className="text-sm text-ink">{s.summary}</p>
            {s.evidence_url && (
              <a
                href={s.evidence_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-navy underline"
              >
                evidence
              </a>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
