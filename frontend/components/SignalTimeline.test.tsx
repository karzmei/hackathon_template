import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { SignalTimeline } from "./SignalTimeline";
import { makeSignal } from "@/test/fixtures";

describe("SignalTimeline", () => {
  it("orders signals newest-first by observed_at", () => {
    const older = makeSignal({ id: "old", observed_at: "2026-01-01", summary: "older event" });
    const newer = makeSignal({ id: "new", observed_at: "2026-09-09", summary: "newer event" });

    render(<SignalTimeline signals={[older, newer]} />);

    const items = screen.getAllByRole("listitem");
    expect(within(items[0]).getByText("newer event")).toBeInTheDocument();
    expect(within(items[1]).getByText("older event")).toBeInTheDocument();
  });

  it("renders the source and confidence percent", () => {
    render(<SignalTimeline signals={[makeSignal({ source: "zefix", confidence: 0.9 })]} />);
    expect(screen.getByText("zefix")).toBeInTheDocument();
    expect(screen.getByText(/confidence 90%/)).toBeInTheDocument();
  });

  it("shows the evidence link only when evidence_url is set", () => {
    const { rerender } = render(
      <SignalTimeline signals={[makeSignal({ evidence_url: "https://e.test/x" })]} />,
    );
    expect(screen.getByRole("link", { name: "evidence" })).toHaveAttribute("href", "https://e.test/x");

    rerender(<SignalTimeline signals={[makeSignal({ evidence_url: null })]} />);
    expect(screen.queryByRole("link", { name: "evidence" })).not.toBeInTheDocument();
  });
});
