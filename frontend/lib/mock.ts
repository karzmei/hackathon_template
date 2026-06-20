// Typed mock dataset mirroring the DRIFTWATCH cockpit design. It is shaped against
// the real api.ts interfaces so the cockpit renders identically whether the data
// comes from the backend or this fallback. Presentation-only fields the API does
// not carry (jurisdiction, LEI, sparkline, age) live in clientMeta, kept frontend
// only so the schemas.py <-> api.ts contract stays untouched.

import type {
  Alert,
  AlertRow,
  AuditEvent,
  CostToday,
  DriftDimension,
  DriftScore,
  Profile,
  Signal,
} from "@/lib/api";

// Cosmetic "signals seen today" counter for the header pill (not an API field).
export const mockSignalsToday = 1284;

export interface ClientMeta {
  jurisdiction: string;
  lei: string;
  onboarded: string;
  sparkline: number[];
  age: string;
  trend: "up" | "down" | "flat";
}

function cost(usd: number, tin: number, tout: number) {
  return { tokens_in: tin, tokens_out: tout, usd };
}

function dim(
  dimension: string,
  from: string,
  to: string,
  delta: number,
): DriftDimension {
  return { dimension, from, to, delta, weight: 1 };
}

function sig(over: Partial<Signal> & Pick<Signal, "id" | "source" | "observed_at" | "summary" | "confidence">): Signal {
  return {
    client_id: "",
    kind: "signal",
    evidence_url: null,
    raw: {},
    ...over,
  };
}

function audit(entity_id: string, type: string, actor: string, at: string): AuditEvent {
  return { entity_id, type, actor, payload: {}, at };
}

// ---- Helvetia: the headline DEEP case, fully populated. ----

const helvetiaDrift: DriftScore = {
  client_id: "helvetia",
  per_dimension: [
    dim("Business model", "B2B SaaS platform", "Crypto OTC trading desk", 0.95),
    dim("Ownership", "2 UBOs (screened)", "3 UBOs - 1 unscreened", 0.8),
    dim("Expected volume", "< CHF 500k / mo", "> CHF 4M / mo", 0.85),
    dim("Legal form", "GmbH", "AG", 0.5),
    dim("Primary domain", "helvetia-saas.ch", "helvetia-otc.io", 0.55),
    dim("Risk rating", "LOW", "HIGH", 0.9),
    dim("Jurisdiction", "Zurich, CH", "Zurich, CH", 0.0),
  ],
  aggregate: 0.82,
  band: "high",
  confidence: 0.87,
  invalidated_assumptions: ["business model", "ownership", "expected volume"],
};

const helvetiaBaseline: Profile = {
  client_id: "helvetia",
  business_model: "B2B SaaS platform",
  expected_activity: "Subscription billing revenue",
  expected_volume_band: "< CHF 500k / mo",
  owners: [
    { name: "A. Meier", pct: 60, screened: true },
    { name: "T. Brunner", pct: 40, screened: true },
  ],
  legal_form: "GmbH",
  domain: "helvetia-saas.ch",
  risk_rating: "LOW",
};

const helvetiaCurrent: Profile = {
  client_id: "helvetia",
  business_model: "Crypto OTC trading desk",
  expected_activity: "OTC digital-asset brokerage",
  expected_volume_band: "> CHF 4M / mo",
  owners: [
    { name: "A. Meier", pct: 45, screened: true },
    { name: "T. Brunner", pct: 35, screened: true },
    { name: "Northwind Holdings", pct: 20, screened: false },
  ],
  legal_form: "AG",
  domain: "helvetia-otc.io",
  risk_rating: "HIGH",
};

const helvetia: Alert = {
  id: "alert-helvetia",
  client_id: "helvetia",
  client_name: "Helvetia SaaS GmbH",
  risk_band: "MEDIUM -> HIGH",
  top_change: "Site pivoted from SaaS to a crypto OTC desk; new unscreened shareholder",
  status: "needs_review",
  recommended_action: "re_kyc",
  analysis_depth: 3,
  cost: cost(0.12, 9100, 2400),
  created_at: "2026-06-19T06:02:00+02:00",
  drift_score: helvetiaDrift,
  implies:
    "Onboarded as a low-volume B2B SaaS vendor, Helvetia now operates as a crypto OTC desk under a new legal form, with an unscreened beneficial owner and monthly volumes roughly 8x the onboarded band. Re-KYC with enhanced due diligence is required before further activity.",
  signals: [
    sig({
      id: "hv-1",
      source: "ON-CHAIN KYT",
      observed_at: "2026-06-17",
      kind: "counterparty_exposure",
      summary:
        "Counterparty wallet shows direct exposure to a high-risk VASP; Travel-Rule data incomplete.",
      confidence: 0.78,
      evidence_url: "https://example.com/kyt/helvetia",
    }),
    sig({
      id: "hv-2",
      source: "ZEFIX",
      observed_at: "2026-06-10",
      kind: "registry_change",
      summary:
        "Commercial register: legal form changed GmbH -> AG; one new shareholder added.",
      confidence: 0.95,
      evidence_url: "https://www.zefix.ch/helvetia",
    }),
    sig({
      id: "hv-3",
      source: "GDELT",
      observed_at: "2026-05-29",
      kind: "adverse_media",
      summary: "Trade press reports the firm relaunching as a digital-asset brokerage.",
      confidence: 0.62,
      evidence_url: "https://example.com/gdelt/helvetia",
    }),
    sig({
      id: "hv-4",
      source: "WAYBACK",
      observed_at: "2026-05-14",
      kind: "domain_change",
      summary:
        "Homepage copy shifted from 'SaaS billing platform' to 'OTC desk for institutional crypto'.",
      confidence: 0.71,
      evidence_url: "https://web.archive.org/helvetia",
    }),
  ],
  baseline: helvetiaBaseline,
  current: helvetiaCurrent,
  audit: [
    audit("alert-helvetia", "created", "system", "2026-06-19T06:02:00+02:00"),
    audit("alert-helvetia", "opened", "a.meier", "2026-06-19T08:14:00+02:00"),
  ],
};

// ---- Meridian: second DEEP case (sanctions hit). ----

const meridian: Alert = {
  id: "alert-meridian",
  client_id: "meridian",
  client_name: "Meridian Capital AG",
  risk_band: "LOW -> HIGH",
  top_change: "Beneficial owner matched to a new sanctions designation",
  status: "needs_review",
  recommended_action: "escalate",
  analysis_depth: 3,
  cost: cost(0.14, 10200, 2800),
  created_at: "2026-06-19T05:10:00+02:00",
  drift_score: {
    client_id: "meridian",
    per_dimension: [
      dim("Ownership", "3 UBOs (screened)", "1 UBO sanctioned", 0.92),
      dim("Risk rating", "MEDIUM", "HIGH", 0.85),
      dim("Sanctions exposure", "None", "OFAC SDN match", 0.95),
      dim("Jurisdiction", "Geneva, CH", "Geneva, CH", 0.0),
    ],
    aggregate: 0.88,
    band: "high",
    confidence: 0.91,
    invalidated_assumptions: ["ownership", "sanctions exposure"],
  },
  implies:
    "A beneficial owner now matches a sanctions designation added this week. This is a hard stop: escalate to the MLRO and freeze further onboarding activity pending review.",
  signals: [
    sig({
      id: "mc-1",
      source: "SANCTIONS",
      observed_at: "2026-06-18",
      kind: "sanctions_match",
      summary: "UBO name and DOB match a new OFAC SDN listing (confidence high).",
      confidence: 0.9,
      evidence_url: "https://sanctionssearch.ofac.treas.gov/",
    }),
    sig({
      id: "mc-2",
      source: "ZEFIX",
      observed_at: "2026-06-12",
      kind: "registry_change",
      summary: "Shareholder structure updated; ultimate owner traced offshore.",
      confidence: 0.83,
      evidence_url: "https://www.zefix.ch/meridian",
    }),
  ],
  baseline: {
    client_id: "meridian",
    business_model: "Asset management",
    expected_activity: "Discretionary portfolio management",
    expected_volume_band: "CHF 1-5M / mo",
    owners: [{ name: "L. Favre", pct: 100, screened: true }],
    legal_form: "AG",
    domain: "meridian-capital.ch",
    risk_rating: "MEDIUM",
  },
  current: {
    client_id: "meridian",
    business_model: "Asset management",
    expected_activity: "Discretionary portfolio management",
    expected_volume_band: "CHF 1-5M / mo",
    owners: [{ name: "L. Favre", pct: 100, screened: false }],
    legal_form: "AG",
    domain: "meridian-capital.ch",
    risk_rating: "HIGH",
  },
  audit: [audit("alert-meridian", "created", "system", "2026-06-19T05:10:00+02:00")],
};

// ---- Lighter cases (STD / FAST). Valid, smaller detail. ----

function lightAlert(
  id: string,
  name: string,
  riskBand: string,
  top: string,
  status: Alert["status"],
  action: Alert["recommended_action"],
  depth: number,
  usd: number,
  drift: { agg: number; band: DriftScore["band"]; conf: number; dims: DriftDimension[] },
  signal: Signal,
  implies: string,
  createdAt: string,
): Alert {
  return {
    id,
    client_id: id.replace("alert-", ""),
    client_name: name,
    risk_band: riskBand,
    top_change: top,
    status,
    recommended_action: action,
    analysis_depth: depth,
    cost: cost(usd, Math.round(usd * 40000), Math.round(usd * 12000)),
    created_at: createdAt,
    drift_score: {
      client_id: id.replace("alert-", ""),
      per_dimension: drift.dims,
      aggregate: drift.agg,
      band: drift.band,
      confidence: drift.conf,
      invalidated_assumptions: drift.dims.filter((d) => d.delta > 0).map((d) => d.dimension.toLowerCase()),
    },
    implies,
    signals: [signal],
    baseline: {
      client_id: id.replace("alert-", ""),
      business_model: "-",
      expected_activity: "-",
      expected_volume_band: "-",
      owners: [],
      legal_form: "-",
      domain: "-",
      risk_rating: drift.band === "low" ? "LOW" : "MEDIUM",
    },
    current: {
      client_id: id.replace("alert-", ""),
      business_model: "-",
      expected_activity: "-",
      expected_volume_band: "-",
      owners: [],
      legal_form: "-",
      domain: "-",
      risk_rating: drift.band.toUpperCase(),
    },
    audit: [audit(id, "created", "system", createdAt)],
  };
}

const alpine = lightAlert(
  "alert-alpine",
  "Alpine Logistics SA",
  "LOW -> MEDIUM",
  "Adverse media: regulatory probe opened in Germany",
  "new",
  "edd",
  2,
  0.03,
  {
    agg: 0.42,
    band: "medium",
    conf: 0.7,
    dims: [
      dim("Adverse media", "None", "Regulatory probe (DE)", 0.55),
      dim("Risk rating", "LOW", "MEDIUM", 0.45),
    ],
  },
  sig({
    id: "al-1",
    client_id: "alpine",
    source: "GDELT",
    observed_at: "2026-06-18",
    kind: "adverse_media",
    summary: "German regulator opened a probe into freight-invoicing practices.",
    confidence: 0.66,
    evidence_url: "https://example.com/gdelt/alpine",
  }),
  "Adverse media suggests elevated risk but no confirmed finding yet. Enhanced due diligence is the proportionate next step.",
  "2026-06-19T04:00:00+02:00",
);

const nordwind = lightAlert(
  "alert-nordwind",
  "Nordwind Trading GmbH",
  "LOW -> MEDIUM",
  "Monthly transaction volume exceeded expected band 4x",
  "new",
  "re_kyc",
  2,
  0.04,
  {
    agg: 0.48,
    band: "medium",
    conf: 0.74,
    dims: [
      dim("Expected volume", "CHF 200k / mo", "CHF 800k / mo", 0.6),
      dim("Risk rating", "LOW", "MEDIUM", 0.4),
    ],
  },
  sig({
    id: "nw-1",
    client_id: "nordwind",
    source: "TXN MONITOR",
    observed_at: "2026-06-17",
    kind: "volume_spike",
    summary: "Monthly throughput rose to 4x the onboarded expected band.",
    confidence: 0.81,
    evidence_url: null,
  }),
  "Transaction volume materially exceeds the onboarded expectation. Refresh the KYC profile to confirm the new activity profile.",
  "2026-06-19T03:00:00+02:00",
);

const lakeside = lightAlert(
  "alert-lakeside",
  "Lakeside Pharma AG",
  "LOW",
  "Baseline confirmed; earlier flagged change retracted",
  "dismissed",
  "no_change",
  1,
  0.0,
  {
    agg: 0.06,
    band: "low",
    conf: 0.9,
    dims: [dim("Business model", "Pharma R&D", "Pharma R&D", 0.0)],
  },
  sig({
    id: "lk-1",
    client_id: "lakeside",
    source: "ZEFIX",
    observed_at: "2026-06-15",
    kind: "registry_confirm",
    summary: "Commercial register unchanged; earlier flagged amendment was withdrawn.",
    confidence: 0.92,
    evidence_url: "https://www.zefix.ch/lakeside",
  }),
  "No material drift from the onboarded baseline. The earlier signal was retracted; no action required.",
  "2026-06-19T01:00:00+02:00",
);

const bergmann = lightAlert(
  "alert-bergmann",
  "Bergmann Holding AG",
  "LOW",
  "No material drift; account dormancy unchanged",
  "dismissed",
  "no_change",
  1,
  0.0,
  {
    agg: 0.04,
    band: "low",
    conf: 0.88,
    dims: [dim("Activity", "Dormant", "Dormant", 0.0)],
  },
  sig({
    id: "bg-1",
    client_id: "bergmann",
    source: "TXN MONITOR",
    observed_at: "2026-06-14",
    kind: "dormancy",
    summary: "Account remains dormant; no transactions in the observation window.",
    confidence: 0.85,
    evidence_url: null,
  }),
  "The account stays dormant with no material change from baseline. No action required.",
  "2026-06-19T00:00:00+02:00",
);

const ALERTS: Alert[] = [helvetia, meridian, alpine, nordwind, lakeside, bergmann];

export const clientMeta: Record<string, ClientMeta> = {
  "alert-helvetia": {
    jurisdiction: "Zurich, CH",
    lei: "5299-00H7-EX",
    onboarded: "onboarded Apr 2023",
    sparkline: [0.9, 0.8, 0.85, 0.6, 0.9],
    age: "13m",
    trend: "up",
  },
  "alert-meridian": {
    jurisdiction: "Geneva, CH",
    lei: "5493-00M2-AG",
    onboarded: "onboarded Jan 2022",
    sparkline: [0.85, 0.4, 0.9, 0.5, 0.7],
    age: "1h",
    trend: "up",
  },
  "alert-alpine": {
    jurisdiction: "Basel, CH",
    lei: "5299-00AL-SA",
    onboarded: "onboarded Sep 2024",
    sparkline: [0.5, 0.3, 0.45, 0.6, 0.25],
    age: "2h",
    trend: "up",
  },
  "alert-nordwind": {
    jurisdiction: "Zug, CH",
    lei: "5299-00NW-GM",
    onboarded: "onboarded Mar 2023",
    sparkline: [0.3, 0.7, 0.4, 0.35, 0.5],
    age: "3h",
    trend: "up",
  },
  "alert-lakeside": {
    jurisdiction: "Lausanne, CH",
    lei: "5299-00LP-AG",
    onboarded: "onboarded Nov 2021",
    sparkline: [0.1, 0.05, 0.1, 0.0, 0.05],
    age: "5h",
    trend: "down",
  },
  "alert-bergmann": {
    jurisdiction: "Zurich, CH",
    lei: "5299-00BH-AG",
    onboarded: "onboarded Jun 2020",
    sparkline: [0.05, 0.0, 0.1, 0.05, 0.0],
    age: "6h",
    trend: "flat",
  },
};

// Strip the detail-only fields to get the queue row shape.
export function toRow(a: Alert): AlertRow {
  return {
    id: a.id,
    client_name: a.client_name,
    risk_band: a.risk_band,
    top_change: a.top_change,
    status: a.status,
    recommended_action: a.recommended_action,
    analysis_depth: a.analysis_depth,
    cost: a.cost,
    created_at: a.created_at,
  };
}

export const mockAlerts: Record<string, Alert> = Object.fromEntries(
  ALERTS.map((a) => [a.id, a]),
);

export const mockAlertRows: AlertRow[] = ALERTS.map(toRow);

export const mockCostToday: CostToday = {
  tokens_in: ALERTS.reduce((s, a) => s + a.cost.tokens_in, 0),
  tokens_out: ALERTS.reduce((s, a) => s + a.cost.tokens_out, 0),
  usd: 0.41,
  alerts: ALERTS.length,
};
