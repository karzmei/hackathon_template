// Shared test builders (mirrors the inc-b2c-mvp test-utils/fixtures pattern).
// Terse factories returning valid api shapes; pass overrides to shape a case.

import type {
  Alert,
  AlertRow,
  Cost,
  DriftScore,
  Profile,
  Signal,
} from "@/lib/api";

export function makeCost(over: Partial<Cost> = {}): Cost {
  return { tokens_in: 120, tokens_out: 80, usd: 0.001316, ...over };
}

export function makeProfile(over: Partial<Profile> = {}): Profile {
  return {
    client_id: "helvetia",
    business_model: "B2B SaaS",
    expected_activity: "subscription revenue",
    expected_volume_band: "low",
    owners: [
      { name: "Anna", pct: 60, screened: true },
      { name: "Ben", pct: 40, screened: true },
    ],
    legal_form: "GmbH",
    domain: "helvetia.example",
    risk_rating: "low",
    ...over,
  };
}

export function makeDriftScore(over: Partial<DriftScore> = {}): DriftScore {
  return {
    client_id: "helvetia",
    per_dimension: [],
    aggregate: 0.8,
    band: "high",
    confidence: 0.92,
    invalidated_assumptions: ["business model", "ownership"],
    ...over,
  };
}

export function makeSignal(over: Partial<Signal> = {}): Signal {
  return {
    id: "hv-1",
    client_id: "helvetia",
    source: "wayback",
    observed_at: "2026-05-04",
    kind: "domain_change",
    summary: "Website changed to a crypto OTC desk.",
    evidence_url: "https://web.archive.org/helvetia",
    confidence: 0.82,
    raw: {},
    ...over,
  };
}

export function makeAlertRow(over: Partial<AlertRow> = {}): AlertRow {
  return {
    id: "alert-helvetia",
    client_name: "Helvetia SaaS GmbH",
    risk_band: "LOW -> HIGH",
    top_change: "business model: B2B SaaS -> Crypto OTC desk",
    status: "needs_review",
    recommended_action: "re_kyc",
    analysis_depth: 3,
    cost: makeCost(),
    created_at: "2026-06-19T10:00:00Z",
    ...over,
  };
}

export function makeAlert(over: Partial<Alert> = {}): Alert {
  const row = makeAlertRow();
  return {
    ...row,
    client_id: "helvetia",
    drift_score: makeDriftScore(),
    implies: "Re-KYC recommended; the onboarded profile no longer holds.",
    signals: [makeSignal()],
    baseline: makeProfile(),
    current: makeProfile({ business_model: "Crypto OTC desk", risk_rating: "high" }),
    audit: [
      { entity_id: "alert-helvetia", type: "created", actor: "system", payload: {}, at: "2026-06-19T10:00:00Z" },
    ],
    ...over,
  };
}
