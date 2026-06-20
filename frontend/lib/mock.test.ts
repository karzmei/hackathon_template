import { describe, it, expect } from "vitest";
import {
  clientMeta,
  mockAlertRows,
  mockAlerts,
  mockCostToday,
  mockSignalsToday,
  toRow,
} from "./mock";

describe("mock dataset", () => {
  it("@unit exposes the six cockpit clients as rows", () => {
    expect(mockAlertRows).toHaveLength(6);
    const names = mockAlertRows.map((r) => r.client_name);
    expect(names).toContain("Helvetia SaaS GmbH");
    expect(names).toContain("Lakeside Pharma AG");
  });

  it("@unit gives every row a full detail alert and presentation meta", () => {
    for (const row of mockAlertRows) {
      expect(mockAlerts[row.id]).toBeDefined();
      expect(mockAlerts[row.id].client_id).toBe(row.id.replace("alert-", ""));
      expect(clientMeta[row.id]).toBeDefined();
      expect(clientMeta[row.id].sparkline.length).toBeGreaterThan(0);
    }
  });

  it("@unit models Helvetia as a high-band DEEP case with seven dimensions", () => {
    const hv = mockAlerts["alert-helvetia"];
    expect(hv.drift_score.band).toBe("high");
    expect(hv.drift_score.per_dimension).toHaveLength(7);
    expect(hv.analysis_depth).toBe(3);
    expect(hv.signals.length).toBeGreaterThanOrEqual(4);
  });

  it("@unit toRow strips the detail-only fields", () => {
    const row = toRow(mockAlerts["alert-helvetia"]);
    expect(row).not.toHaveProperty("drift_score");
    expect(row).not.toHaveProperty("signals");
    expect(row.client_name).toBe("Helvetia SaaS GmbH");
  });

  it("@unit reports a deterministic cost-today total", () => {
    expect(mockCostToday.alerts).toBe(6);
    expect(mockCostToday.usd).toBeCloseTo(0.41, 2);
    expect(mockSignalsToday).toBeGreaterThan(0);
  });
});
