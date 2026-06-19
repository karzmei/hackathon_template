import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RiskBand } from "./RiskBand";
import type { DriftScore } from "@/lib/api";

function drift(overrides: Partial<DriftScore> = {}): DriftScore {
  return {
    client_id: "helvetia",
    per_dimension: [],
    aggregate: 0.8,
    band: "high",
    confidence: 0.92,
    invalidated_assumptions: ["business model", "ownership"],
    ...overrides,
  };
}

describe("RiskBand", () => {
  it("shows the risk band, confidence percent, and implies text", () => {
    render(
      <RiskBand
        riskBand="HIGH"
        drift={drift()}
        implies="Re-KYC recommended; the onboarded profile no longer holds."
      />,
    );
    expect(screen.getByText("HIGH")).toBeInTheDocument();
    expect(screen.getByText(/confidence 92%/)).toBeInTheDocument();
    expect(screen.getByText(/Re-KYC recommended/)).toBeInTheDocument();
  });

  it("pluralizes invalidated assumptions", () => {
    render(<RiskBand riskBand="HIGH" drift={drift()} implies="" />);
    expect(screen.getByText(/2 invalidated assumptions/)).toBeInTheDocument();
  });

  it("uses the singular for a single invalidated assumption", () => {
    render(
      <RiskBand
        riskBand="MEDIUM"
        drift={drift({ band: "medium", invalidated_assumptions: ["ownership"] })}
        implies=""
      />,
    );
    expect(screen.getByText(/1 invalidated assumption$/)).toBeInTheDocument();
  });
});
