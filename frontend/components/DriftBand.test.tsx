import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DriftBand } from "./DriftBand";
import { makeDriftScore } from "@/test/fixtures";

describe("DriftBand", () => {
  it("renders the aggregate score, band and confidence", () => {
    const drift = makeDriftScore({ aggregate: 0.82, band: "high", confidence: 0.87 });
    render(<DriftBand drift={drift} riskBand="MEDIUM -> HIGH" />);

    expect(screen.getByText(/AGGREGATE DRIFT - MEDIUM -> HIGH - 87% CONF/)).toBeInTheDocument();
    expect(screen.getByText("0.82")).toBeInTheDocument();
    expect(screen.getByText("/ HIGH")).toBeInTheDocument();
  });

  it("positions the marker at the aggregate percentage", () => {
    const drift = makeDriftScore({ aggregate: 0.82 });
    render(<DriftBand drift={drift} riskBand="MEDIUM -> HIGH" />);
    expect(screen.getByTestId("drift-marker")).toHaveStyle({ left: "82%" });
  });
});
