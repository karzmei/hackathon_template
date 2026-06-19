import { ExternalLink } from "lucide-react";
import { Signal } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// What changed and when: newest-first, source-cited; every claim traces to an artifact.
export function SignalTimeline({ signals }: { signals: Signal[] }) {
  const ordered = [...signals].sort((a, b) =>
    b.observed_at.localeCompare(a.observed_at),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif text-lg">Source-cited timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-4">
          {ordered.map((s) => (
            <li
              key={s.id}
              className="border-l-2 pl-3"
              style={{ borderColor: "var(--color-border-info)" }}
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="font-semibold uppercase tracking-wide text-foreground">
                  {s.source}
                </span>
                <span>{s.observed_at}</span>
                <span>confidence {(s.confidence * 100).toFixed(0)}%</span>
              </div>
              <p className="mt-1 text-sm text-foreground">{s.summary}</p>
              {s.evidence_url && (
                <a
                  href={s.evidence_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-xs text-foreground underline underline-offset-2"
                >
                  <ExternalLink className="size-3" aria-hidden />
                  evidence
                </a>
              )}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
