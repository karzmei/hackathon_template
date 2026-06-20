import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CostSummary } from "./CostSummary";
import { costSeed } from "@/lib/cost-seed";
import { compositionSplit, efficiency } from "@/lib/cost-view";

describe("CostSummary", () => {
  it("renders the headline spend, tokens, alert count and per-alert cost", () => {
    render(
      <CostSummary
        totals={costSeed.totals}
        composition={compositionSplit(costSeed)}
        usdPerAlertText={efficiency(costSeed).usdPerAlertText}
      />,
    );
    expect(screen.getByText("$0.02")).toBeInTheDocument();
    expect(screen.getByText("11.6k")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("$0.0027")).toBeInTheDocument();
  });

  it("shows the prompt vs completion split", () => {
    render(
      <CostSummary
        totals={costSeed.totals}
        composition={compositionSplit(costSeed)}
        usdPerAlertText={efficiency(costSeed).usdPerAlertText}
      />,
    );
    expect(screen.getByText(/prompt 9.8k \(85%\)/)).toBeInTheDocument();
    expect(screen.getByText(/completion 1.8k \(15%\)/)).toBeInTheDocument();
  });
});
