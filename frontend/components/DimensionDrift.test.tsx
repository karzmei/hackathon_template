import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { DimensionDrift } from "./DimensionDrift";
import { makeDriftScore } from "@/test/fixtures";

const drift = makeDriftScore({
  per_dimension: [
    { dimension: "Business model", from: "B2B SaaS", to: "Crypto OTC desk", delta: 0.95, weight: 1 },
    { dimension: "Jurisdiction", from: "Zurich, CH", to: "Zurich, CH", delta: 0, weight: 1 },
  ],
});

describe("DimensionDrift", () => {
  it("renders a row per dimension with from -> to", () => {
    render(<DimensionDrift drift={drift} />);
    expect(screen.getByText("Business model")).toBeInTheDocument();
    expect(screen.getByText("B2B SaaS")).toBeInTheDocument();
    expect(screen.getByText("Crypto OTC desk")).toBeInTheDocument();
    expect(screen.getByText("95%")).toBeInTheDocument();
  });

  it("draws a delta bar only for changed dimensions", () => {
    render(<DimensionDrift drift={drift} />);
    const items = screen.getAllByRole("listitem");
    expect(within(items[0]).getByTestId("dimension-bar")).toBeInTheDocument();
    expect(within(items[1]).queryByTestId("dimension-bar")).not.toBeInTheDocument();
  });

  it("renders an empty list when there are no dimensions", () => {
    render(<DimensionDrift drift={makeDriftScore({ per_dimension: [] })} />);
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });
});
