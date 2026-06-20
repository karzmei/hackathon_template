import { describe, it, expect } from "vitest";
import { alertToCase, riskBand, DECISION_TO_ACTION } from "./alert-to-case";
import type { Alert } from "./api";
import type { Decision } from "./cockpit-types";

// @unit: the adapter is a pure function, so the tests feed realistic Alert shapes
// (mirroring backend/schemas.py JSON, including the from/to drift aliases) and assert
// the derived cockpit Case. No React, no network.

function helvetiaAlert(overrides: Partial<Alert> = {}): Alert {
  return {
    id: "helvetia",
    client_id: "helvetia",
    client_name: "Helvetia SaaS GmbH",
    risk_band: "LOW -> HIGH",
    top_change: "Business model shifted to crypto OTC",
    implies: "A SaaS vendor turning into a crypto desk is a material KYC change.",
    status: "needs_review",
    recommended_action: "escalate",
    analysis_depth: 3,
    cost: { tokens_in: 2500, tokens_out: 1200, usd: 0.0312 },
    created_at: "2026-06-20T08:00:00Z",
    drift_score: {
      client_id: "helvetia",
      aggregate: 0.85,
      band: "high",
      confidence: 0.78,
      invalidated_assumptions: ["Business model is B2B SaaS"],
      per_dimension: [
        { dimension: "business_model", from: "B2B SaaS", to: "Crypto OTC desk", delta: 1.0, weight: 0.3 },
        { dimension: "ownership", from: "Meier/Brun", to: "+ Nordwind Holdings", delta: 0.6, weight: 0.2 },
      ],
    },
    signals: [
      {
        id: "hv-1",
        client_id: "helvetia",
        source: "wayback",
        observed_at: "2026-05-04",
        kind: "domain_change",
        summary: "Website overhauled into a crypto OTC trading desk",
        evidence_url: "https://web.archive.org/x",
        confidence: 0.82,
        raw: { business_model: "Crypto OTC desk" },
      },
      {
        id: "hv-2",
        client_id: "helvetia",
        source: "zefix",
        observed_at: "2026-05-10",
        kind: "ownership_change",
        summary: "New 40% shareholder Nordwind Holdings Ltd",
        evidence_url: null,
        confidence: 0.9,
        raw: { add_owner: { name: "Nordwind Holdings", pct: 40, screened: false } },
      },
    ],
    baseline: {
      client_id: "helvetia",
      business_model: "B2B SaaS",
      expected_activity: "Monthly subscription revenue",
      expected_volume_band: "low",
      owners: [
        { name: "Anna Meier", pct: 60, screened: true },
        { name: "Thomas Brun", pct: 40, screened: true },
      ],
      legal_form: "GmbH",
      domain: "helvetia-saas.ch",
      risk_rating: "LOW",
    },
    current: {
      client_id: "helvetia",
      business_model: "Crypto OTC desk",
      expected_activity: "High-volume crypto inflows",
      expected_volume_band: "high",
      owners: [
        { name: "Anna Meier", pct: 36, screened: true },
        { name: "Nordwind Holdings", pct: 40, screened: false },
      ],
      legal_form: "AG",
      domain: "helvetia-otc.io",
      risk_rating: "HIGH",
    },
    audit: [
      { entity_id: "helvetia", type: "created", actor: "system", payload: { band: "high" }, at: "2026-06-20T08:00:00Z" },
    ],
    ...overrides,
  };
}

describe("alertToCase mapping", () => {
  it("maps identity, band delta, and materiality from the drift score", () => {
    const c = alertToCase(helvetiaAlert());
    expect(c.id).toBe("helvetia");
    expect(c.client).toBe("Helvetia SaaS GmbH");
    expect(c.band).toBe("HIGH");
    expect(c.prevBand).toBe("LOW"); // from baseline.risk_rating
    expect(c.materiality).toBe(85); // round(0.85 * 100)
    expect(c.headline).toBe(helvetiaAlert().implies);
  });

  it("builds drift signal bars from the weighted per-dimension contributions", () => {
    const c = alertToCase(helvetiaAlert());
    expect(c.signals).toEqual([
      { label: "Business model · B2B SaaS -> Crypto OTC desk", pts: 30 }, // 1.0 * 0.3 * 100
      { label: "Ownership · Meier/Brun -> + Nordwind Holdings", pts: 12 }, // 0.6 * 0.2 * 100
    ]);
  });

  it("builds the cited what-changed timeline from the public signals", () => {
    const c = alertToCase(helvetiaAlert());
    expect(c.changes).toEqual([
      { dir: "negative", text: "Website overhauled into a crypto OTC trading desk", src: "Web archive · 4 May" },
      { dir: "negative", text: "New 40% shareholder Nordwind Holdings Ltd", src: "ZEFIX registry · 10 May" },
    ]);
  });

  it("derives key facts from the live profile, flagging unscreened owners", () => {
    const c = alertToCase(helvetiaAlert());
    expect(c.facts).toContain("Legal form AG");
    expect(c.facts).toContain("Domain helvetia-otc.io");
    expect(c.facts).toContain("Expected volume high");
    expect(c.facts.some((f) => f.includes("Nordwind Holdings 40% (unscreened)"))).toBe(true);
  });

  it("maps needs_review to a flagged, unread case with an escalate recommendation", () => {
    const c = alertToCase(helvetiaAlert());
    expect(c.status).toBe("flagged_by_rm");
    expect(c.unread).toBe(true);
    expect(c.quiet).toBe(false);
    expect(c.recAction).toBe("escalate_compliance");
    expect(c.recLabel).toBe("Escalate to Compliance");
    expect(c.compRec).toBe("mlro"); // escalate -> mlro
    expect(c.decision).toBeNull(); // not decided yet
  });

  it("maps a no_change alert to a quiet, monitored case", () => {
    const c = alertToCase(
      helvetiaAlert({
        recommended_action: "no_change",
        status: "new",
        drift_score: { ...helvetiaAlert().drift_score, aggregate: 0.05, band: "low" },
      }),
    );
    expect(c.quiet).toBe(true);
    expect(c.status).toBe("open");
    expect(c.recAction).toBe("monitor");
    expect(c.band).toBe("LOW");
    expect(c.materiality).toBe(5);
    expect(c.compRec).toBeNull();
  });

  it("reconstructs a decided case from an actioned alert", () => {
    const c = alertToCase(helvetiaAlert({ status: "actioned", recommended_action: "re_kyc" }));
    expect(c.status).toBe("decided");
    expect(c.decision).toBe("re_kyc");
  });

  it("maps a dismissed alert to a dismissed decision", () => {
    const c = alertToCase(helvetiaAlert({ status: "dismissed", recommended_action: "no_change" }));
    expect(c.status).toBe("decided");
    expect(c.decision).toBe("dismiss");
  });

  it("summarises the audit trail", () => {
    const c = alertToCase(helvetiaAlert());
    expect(c.audit).toEqual([{ ts: "20 Jun", actor: "system", action: "Case created (band high)" }]);
  });

  it("leaves messages empty (no backend equivalent)", () => {
    expect(alertToCase(helvetiaAlert()).messages).toEqual([]);
  });
});

describe("riskBand", () => {
  it("normalises backend bands and ratings, defaulting to LOW", () => {
    expect(riskBand("high")).toBe("HIGH");
    expect(riskBand("MEDIUM")).toBe("MEDIUM");
    expect(riskBand("low")).toBe("LOW");
    expect(riskBand("")).toBe("LOW");
    expect(riskBand("unknown")).toBe("LOW");
  });
});

describe("DECISION_TO_ACTION", () => {
  it("maps every cockpit decision to a backend action", () => {
    const expected: Record<Decision, string> = {
      re_kyc: "re_kyc",
      doc_request: "edd",
      watchlist: "escalate",
      mlro: "escalate",
      dismiss: "no_change",
    };
    expect(DECISION_TO_ACTION).toEqual(expected);
  });
});
