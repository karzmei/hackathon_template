import { Signal } from "@/lib/api";
import { confTone } from "@/lib/cockpit";
import { SeverityBadge } from "@/components/ui/severity-badge";

// What changed and when: newest-first, source-cited; every claim traces to an artifact.
export function SignalTimeline({ signals }: { signals: Signal[] }) {
  const ordered = [...signals].sort((a, b) =>
    b.observed_at.localeCompare(a.observed_at),
  );

  return (
    <ol>
      {ordered.map((s) => (
        <li key={s.id} className="border-t py-3 first:border-t-0">
          <div className="mb-1 flex items-center gap-2">
            <span className="font-mono text-[10px] font-semibold text-foreground">
              {s.source}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {s.observed_at}
            </span>
            <SeverityBadge
              tone={confTone(s.confidence)}
              label={`conf ${s.confidence.toFixed(2)}`}
              size="sm"
              className="ml-auto"
            />
          </div>
          <p className="mb-1 font-serif text-[13px] leading-relaxed text-foreground">
            {s.summary}
          </p>
          {s.evidence_url && (
            <a
              href={s.evidence_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[10.5px] font-medium text-muted-foreground"
            >
              evidence ↗
            </a>
          )}
        </li>
      ))}
    </ol>
  );
}
