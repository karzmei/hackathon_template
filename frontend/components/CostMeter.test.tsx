import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CostMeter } from "./CostMeter";
import { makeCost } from "@/test/fixtures";

const cost = makeCost();

describe("CostMeter", () => {
  it("formats usd to four decimals and sums the tokens", () => {
    render(<CostMeter cost={cost} />);
    expect(screen.getByText(/\$0\.0013/)).toBeInTheDocument();
    expect(screen.getByText(/200 tok/)).toBeInTheDocument();
  });

  it("renders the depth label when a depth is given", () => {
    render(<CostMeter cost={cost} depth={3} />);
    expect(screen.getByText("DEEP")).toBeInTheDocument();
  });

  it("omits the depth chip when no depth is given", () => {
    render(<CostMeter cost={cost} />);
    expect(screen.queryByText("DEEP")).not.toBeInTheDocument();
    expect(screen.queryByText("BASIC")).not.toBeInTheDocument();
  });

  it("maps shallow depths to FAST and STD", () => {
    const { rerender } = render(<CostMeter cost={cost} depth={1} />);
    expect(screen.getByText("FAST")).toBeInTheDocument();
    rerender(<CostMeter cost={cost} depth={2} />);
    expect(screen.getByText("STD")).toBeInTheDocument();
  });

  it("renders a zero cost without breaking the format", () => {
    render(<CostMeter cost={makeCost({ usd: 0, tokens_in: 0, tokens_out: 0 })} />);
    expect(screen.getByText(/\$0\.0000/)).toBeInTheDocument();
    expect(screen.getByText(/0 tok/)).toBeInTheDocument();
  });

  it("uses a custom label when given", () => {
    render(<CostMeter cost={cost} label="today" />);
    expect(screen.getByText(/today/)).toBeInTheDocument();
  });
});
