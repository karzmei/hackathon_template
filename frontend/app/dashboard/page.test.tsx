import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CostDashboardPage from "./page";

// Live mode is off in tests (NEXT_PUBLIC_USE_BACKEND unset), so the page renders the
// demo seed offline. It asserts the cost-efficiency sections, the explicit DEMO badge,
// and the back link to the cockpit.

describe("Cost dashboard page", () => {
  it("renders the meter, funnel, and breakdown sections from the demo seed", () => {
    render(<CostDashboardPage />);
    expect(screen.getByText("TOTAL SPEND TODAY")).toBeInTheDocument();
    expect(screen.getByText("SPEND BY CASCADE STAGE")).toBeInTheDocument();
    expect(screen.getByText("SPEND BY MODEL TIER")).toBeInTheDocument();
    expect(screen.getByText("SPEND BY CLIENT")).toBeInTheDocument();
    expect(screen.getByText("WHY THIS IS COST EFFICIENT")).toBeInTheDocument();
    // The total spend, the deep stage, and the deep model tier all read $0.02.
    expect(screen.getAllByText("$0.02").length).toBeGreaterThanOrEqual(1);
  });

  it("labels the data source as demo and links back to the cockpit", () => {
    render(<CostDashboardPage />);
    expect(screen.getByText("DEMO DATA")).toBeInTheDocument();
    const back = screen.getByRole("link", { name: /COCKPIT/ });
    expect(back).toHaveAttribute("href", "/");
  });
});
