// Deterministic demo data for the cost dashboard, shaped to the CostDashboard
// contract in api.ts. It is the offline fallback the dashboard shows when the
// backend is not driving it (mirrors how the cockpit seeds from cockpit-seed.ts).
//
// The numbers tell the cost-efficiency story: a morning batch of eight clients
// enters the cheap rules stage; most die there for ~$0; only the material ones pay
// for the mid-tier reasoning filter; only the two that drift to HIGH pay for the
// deep analysis. So nearly all spend lands on the two cases that actually matter.
//
// Pricing matches backend/config.py PRICING (USD per 1k tokens):
//   reasoning  gpt-4o-mini : 0.00015 in, 0.00060 out
//   deep       gpt-4o      : 0.00250 in, 0.01000 out
// Every figure below is consistent: the stage sums equal the client sums equal the
// totals, so the view helpers can derive exact ratios.

import type { CostDashboard } from "@/lib/api";

export const REASONING_MODEL = "gpt-4o-mini";
export const DEEP_MODEL = "gpt-4o";

export const costSeed: CostDashboard = {
  generated_at: "2026-06-20T08:00:00Z",
  totals: { tokens_in: 9800, tokens_out: 1790, usd: 0.02125, alerts: 8 },
  by_stage: [
    {
      stage: "rules",
      label: "Cheap rules",
      model: null,
      entered: 8,
      survived: 5,
      tokens_in: 0,
      tokens_out: 0,
      usd: 0,
    },
    {
      stage: "reasoning",
      label: "Reasoning filter",
      model: REASONING_MODEL,
      entered: 5,
      survived: 2,
      tokens_in: 6000,
      tokens_out: 750,
      usd: 0.00135,
    },
    {
      stage: "deep",
      label: "Deep analysis",
      model: DEEP_MODEL,
      entered: 2,
      survived: 2,
      tokens_in: 3800,
      tokens_out: 1040,
      usd: 0.0199,
    },
  ],
  by_client: [
    { client_id: "helvetia", client_name: "Helvetia SaaS GmbH", depth: 3, band: "high", tokens_in: 3100, tokens_out: 670, usd: 0.01022 },
    { client_id: "alpine", client_name: "Alpine Crypto Exchange AG", depth: 3, band: "high", tokens_in: 3100, tokens_out: 670, usd: 0.01022 },
    { client_id: "zugersee", client_name: "Zugersee Holdings AG", depth: 2, band: "medium", tokens_in: 1200, tokens_out: 150, usd: 0.00027 },
    { client_id: "rhone", client_name: "Rhone Logistics SA", depth: 2, band: "low", tokens_in: 1200, tokens_out: 150, usd: 0.00027 },
    { client_id: "basel", client_name: "Basel Biotech GmbH", depth: 2, band: "medium", tokens_in: 1200, tokens_out: 150, usd: 0.00027 },
    { client_id: "lakeside", client_name: "Lakeside Trading AG", depth: 1, band: "low", tokens_in: 0, tokens_out: 0, usd: 0 },
    { client_id: "ticino", client_name: "Ticino Retail SA", depth: 1, band: "low", tokens_in: 0, tokens_out: 0, usd: 0 },
    { client_id: "geneva", client_name: "Geneva Art Storage SA", depth: 1, band: "low", tokens_in: 0, tokens_out: 0, usd: 0 },
  ],
  usd_per_alert: 0.002656,
  actionable_alerts: 2,
  usd_per_actionable: 0.010625,
  cheap_exits: 3,
};
