import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CockpitHeader } from "./CockpitHeader";

describe("CockpitHeader", () => {
  const base = { usd: 0.41, signals: 1284, alerts: 6, deep: 2, running: false, onRun: () => {} };

  it("shows the cost and throughput summary", () => {
    render(<CockpitHeader {...base} />);
    expect(screen.getByText("$0.41")).toBeInTheDocument();
    expect(screen.getByText(/1,284 signals - 6 alerts - 2 deep/)).toBeInTheDocument();
  });

  it("calls onRun when the button is clicked", async () => {
    const onRun = vi.fn();
    render(<CockpitHeader {...base} onRun={onRun} />);
    await userEvent.click(screen.getByRole("button", { name: "Run pipeline" }));
    expect(onRun).toHaveBeenCalledTimes(1);
  });

  it("shows a running state and disables the button", () => {
    render(<CockpitHeader {...base} running />);
    const btn = screen.getByRole("button", { name: /Running pipeline/ });
    expect(btn).toBeDisabled();
  });
});
