import { AlertStatus } from "@/lib/api";

const LABELS: Record<AlertStatus, string> = {
  new: "New",
  needs_review: "Needs review",
  escalated: "Escalated",
  dismissed: "Dismissed",
  actioned: "Actioned",
};

const STYLES: Record<AlertStatus, string> = {
  new: "bg-slate-200 text-slate-700",
  needs_review: "bg-amber-200 text-amber-900",
  escalated: "bg-red-200 text-red-900",
  dismissed: "bg-slate-200 text-slate-500",
  actioned: "bg-emerald-200 text-emerald-900",
};

export function StatusPill({ status }: { status: AlertStatus }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  );
}
