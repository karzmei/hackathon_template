// Adapter from the backend `Alert` (api.ts, mirroring backend/schemas.py) to the
// cockpit `Case` (cockpit-types.ts). The cockpit is a richer three-role workflow
// object than the backend exposes, so this derives the frontend-only fields
// (materiality, the cited "what changed" timeline, key facts, recommendation copy)
// deterministically from the alert. Pure and side-effect free, so it is unit-testable.

import type {
  Alert,
  AuditEvent,
  DriftDimension,
  Profile,
  RecommendedAction,
  Signal,
} from "@/lib/api";
import type {
  Case,
  CaseAuditEntry,
  CaseChange,
  CaseStatus,
  Decision,
  DriftSignal,
  RecAction,
  RiskBand,
} from "@/lib/cockpit-types";

// Cockpit Compliance decision -> backend decision action. Used when a live decide()
// round-trips to POST /api/alerts/{id}/decision (the backend enum is narrower).
export const DECISION_TO_ACTION: Record<Decision, RecommendedAction> = {
  re_kyc: "re_kyc",
  doc_request: "edd",
  watchlist: "escalate",
  mlro: "escalate",
  contact_ops: "escalate",
  dismiss: "no_change",
};

// Backend recommendation -> the nearest cockpit Compliance decision, for surfacing
// the second-line recommendation (compRec) and reconstructing a decided case.
const ACTION_TO_DECISION: Record<RecommendedAction, Decision | null> = {
  re_kyc: "re_kyc",
  edd: "doc_request",
  escalate: "mlro",
  no_change: null,
};

const REC_LABEL: Record<RecommendedAction, string> = {
  re_kyc: "Escalate to Compliance for Re-KYC",
  edd: "Escalate to Compliance for Enhanced Due Diligence",
  escalate: "Escalate to Compliance",
  no_change: "Monitor; no material change",
};

const DIMENSION_LABEL: Record<string, string> = {
  business_model: "Business model",
  jurisdiction: "Jurisdiction",
  legal_form: "Legal form",
  ownership: "Ownership",
  domain: "Domain",
  expected_volume: "Expected volume",
  risk_rating: "Risk rating",
};

const SOURCE_LABEL: Record<string, string> = {
  zefix: "ZEFIX registry",
  gdelt: "GDELT media",
  wayback: "Web archive",
  opensanctions: "OpenSanctions",
  onchain_kyt: "On-chain KYT",
  internal_tx: "Internal transactions",
};

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// Normalise a backend band ("low"|"medium"|"high") or risk rating ("LOW"...) to a
// cockpit RiskBand. Falls back to LOW for anything unexpected.
export function riskBand(value: string): RiskBand {
  const v = (value || "").toUpperCase();
  return v === "HIGH" || v === "MEDIUM" ? v : "LOW";
}

function titleCase(key: string): string {
  if (!key) return "";
  const text = key.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Format an ISO date or datetime ("2026-05-04", "2026-05-04T08:00:00Z") as "4 May".
// Parsed by hand to stay timezone-independent and deterministic under fake timers.
function shortDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  if (!m) return "";
  const day = Number(m[3]);
  const month = MONTHS[Number(m[2]) - 1] ?? "";
  return `${day} ${month}`.trim();
}

// The drift breakdown that renders as the signal bars: one bar per scored dimension,
// height from the weighted contribution (delta * weight).
function toDriftSignals(dimensions: DriftDimension[]): DriftSignal[] {
  return dimensions.map((d) => ({
    label: `${DIMENSION_LABEL[d.dimension] ?? titleCase(d.dimension)} · ${d.from} -> ${d.to}`,
    pts: Math.round(d.delta * d.weight * 100),
  }));
}

// The source-cited "what changed" timeline: one entry per surviving public signal,
// citing the source and the date it was observed.
function toChanges(signals: Signal[]): CaseChange[] {
  return signals.map((s) => {
    const source = SOURCE_LABEL[s.source] ?? titleCase(s.source);
    const date = shortDate(s.observed_at);
    return {
      dir: "negative",
      text: s.summary,
      src: date ? `${source} · ${date}` : source,
      url: s.evidence_url ?? undefined,
    };
  });
}

// Key facts pulled from the live profile, with the baseline owner set for contrast.
function toFacts(baseline: Profile, current: Profile): string[] {
  const owners = (current.owners ?? [])
    .map((o) => `${o.name} ${o.pct}%${o.screened ? "" : " (unscreened)"}`)
    .join(", ");
  return [
    `Legal form ${current.legal_form}`,
    `Domain ${current.domain}`,
    `Expected volume ${current.expected_volume_band}`,
    owners ? `Owners: ${owners}` : `Owners: ${baseline.owners?.length ?? 0} on file`,
  ];
}

function toAuditEntry(e: AuditEvent): CaseAuditEntry {
  let action = titleCase(e.type);
  if (e.type === "decision" && typeof e.payload?.action === "string") {
    action = `Decision: ${e.payload.action}`;
  } else if (e.type === "created") {
    const band = e.payload?.band;
    action = band ? `Case created (band ${String(band)})` : "Case created";
  }
  return { ts: shortDate(e.at), actor: e.actor, action };
}

function toStatus(status: Alert["status"]): CaseStatus {
  switch (status) {
    case "needs_review":
      return "flagged_by_rm";
    case "escalated":
      return "escalated_by_am";
    case "actioned":
    case "dismissed":
      return "decided";
    default:
      return "open";
  }
}

function toRecAction(action: RecommendedAction): RecAction {
  return action === "no_change" ? "monitor" : "escalate_compliance";
}

export function alertToCase(alert: Alert): Case {
  const quiet = alert.recommended_action === "no_change";
  const decided = alert.status === "actioned" || alert.status === "dismissed";
  const decision: Decision | null = decided
    ? alert.status === "dismissed"
      ? "dismiss"
      : ACTION_TO_DECISION[alert.recommended_action]
    : null;

  return {
    id: alert.id,
    owner: "rm",
    client: alert.client_name,
    lei: "n/a",
    domicile: "CH",
    sector: alert.current?.business_model || "n/a",
    band: riskBand(alert.drift_score.band),
    prevBand: riskBand(alert.baseline?.risk_rating ?? ""),
    status: toStatus(alert.status),
    decision,
    instructionDone: false,
    unread: alert.status === "needs_review" || alert.status === "escalated",
    quiet,
    materiality: Math.round(alert.drift_score.aggregate * 100),
    headline: alert.implies || alert.top_change,
    signals: toDriftSignals(alert.drift_score.per_dimension),
    changes: toChanges(alert.signals),
    facts: toFacts(alert.baseline, alert.current),
    recAction: toRecAction(alert.recommended_action),
    recLabel: REC_LABEL[alert.recommended_action],
    recRationale: alert.implies || alert.top_change,
    compRec: ACTION_TO_DECISION[alert.recommended_action],
    messages: [],
    audit: alert.audit.map(toAuditEntry),
  };
}
