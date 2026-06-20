// Typed client for the DRIFTWATCH backend.
// The interfaces mirror backend/schemas.py (snake_case matches the JSON on the wire).

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export type RecommendedAction = "no_change" | "re_kyc" | "edd" | "escalate";
export type AlertStatus =
  | "new"
  | "needs_review"
  | "escalated"
  | "dismissed"
  | "actioned";
export type RiskBandLevel = "low" | "medium" | "high";

export interface Cost {
  tokens_in: number;
  tokens_out: number;
  usd: number;
}

export interface Owner {
  name: string;
  pct: number;
  screened: boolean;
}

export interface Profile {
  client_id: string;
  business_model: string;
  expected_activity: string;
  expected_volume_band: string;
  owners: Owner[];
  legal_form: string;
  domain: string;
  risk_rating: string;
}

export interface Signal {
  id: string;
  client_id: string;
  source: string;
  observed_at: string;
  kind: string;
  summary: string;
  evidence_url: string | null;
  confidence: number;
  raw: Record<string, unknown>;
}

export interface DriftDimension {
  dimension: string;
  from: string;
  to: string;
  delta: number;
  weight: number;
}

export interface DriftScore {
  client_id: string;
  per_dimension: DriftDimension[];
  aggregate: number;
  band: RiskBandLevel;
  confidence: number;
  invalidated_assumptions: string[];
}

export interface AuditEvent {
  entity_id: string;
  type: string;
  actor: string;
  payload: Record<string, unknown>;
  at: string;
}

export interface AlertRow {
  id: string;
  client_name: string;
  risk_band: string;
  top_change: string;
  status: AlertStatus;
  recommended_action: RecommendedAction;
  analysis_depth: number;
  cost: Cost;
  created_at: string;
}

export interface Alert extends AlertRow {
  client_id: string;
  drift_score: DriftScore;
  implies: string;
  signals: Signal[];
  baseline: Profile;
  current: Profile;
  audit: AuditEvent[];
}

export interface CostToday {
  tokens_in: number;
  tokens_out: number;
  usd: number;
  alerts: number;
}

// The cascade stages, cheapest to most expensive: step1 rules (no LLM), step2
// reasoning filter (mid-tier deployment), step3 deep analysis (deep deployment).
export type Stage = "rules" | "reasoning" | "deep";

export interface StageCost {
  stage: Stage;
  label: string;
  model: string | null; // deployment used; null for the no-LLM rules stage
  entered: number; // alerts that entered this stage
  survived: number; // how many passed through to the next stage
  tokens_in: number;
  tokens_out: number;
  usd: number;
}

export interface ClientCost {
  client_id: string;
  client_name: string;
  depth: number; // analysis_depth reached: 1, 2, or 3
  band: string; // final risk band, e.g. "high"
  tokens_in: number;
  tokens_out: number;
  usd: number;
}

// The shared cost dashboard payload: the per-stage cascade funnel, the per-client
// breakdown, and the efficiency ratios that show spend concentrating where it matters.
export interface CostDashboard {
  generated_at: string;
  totals: CostToday;
  by_stage: StageCost[]; // ordered rules -> reasoning -> deep
  by_client: ClientCost[];
  usd_per_alert: number;
  actionable_alerts: number; // count of high-band / re-KYC / escalate outcomes
  usd_per_actionable: number; // spend that produced an actionable case
  cheap_exits: number; // alerts resolved at step1 for ~$0
}

// Bound every request so a missing or slow backend fails fast and the data layer
// can fall back to mocks, instead of hanging on a dead localhost connection.
const REQUEST_TIMEOUT_MS = 700;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      cache: "no-store",
      signal: ctrl.signal,
      ...init,
    });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = (await res.json()).detail ?? detail;
    } catch {
      // ignore non-JSON error bodies
    }
    throw new Error(`API ${res.status}: ${detail}`);
  }
  return res.json() as Promise<T>;
}

// JSON body header, set only on mutating calls. Keeping it off GETs avoids a CORS
// preflight (a GET with this header is a non-simple request).
const JSON_HEADERS = { "Content-Type": "application/json" };

export const api = {
  listAlerts: () => request<AlertRow[]>("/api/alerts"),
  runPipeline: () =>
    request<{ alerts: AlertRow[] }>("/api/run", {
      method: "POST",
      headers: JSON_HEADERS,
    }),
  getAlert: (id: string) => request<Alert>(`/api/alerts/${id}`),
  decide: (id: string, action: RecommendedAction, reason?: string) =>
    request<Alert>(`/api/alerts/${id}/decision`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ action, reason, actor: "analyst" }),
    }),
  costToday: () => request<CostToday>("/api/cost/today"),
  costDashboard: () => request<CostDashboard>("/api/cost/dashboard"),
};
