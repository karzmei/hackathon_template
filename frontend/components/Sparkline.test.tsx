import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sparkline } from "./Sparkline";

describe("Sparkline", () => {
  it("renders one bar per value", () => {
    render(<Sparkline values={[0.9, 0.8, 0.85, 0.6, 0.9]} level="high" />);
    expect(screen.getAllByTestId("spark-bar")).toHaveLength(5);
  });

  it("scales bar heights to percentages of the value", () => {
    render(<Sparkline values={[1, 0.5]} level="low" />);
    const bars = screen.getAllByTestId("spark-bar");
    expect(bars[0]).toHaveStyle({ height: "100%" });
    expect(bars[1]).toHaveStyle({ height: "50%" });
  });

  it("exposes an accessible label", () => {
    render(<Sparkline values={[0.3]} level="medium" />);
    expect(screen.getByRole("img", { name: "drift sparkline" })).toBeInTheDocument();
  });
});
