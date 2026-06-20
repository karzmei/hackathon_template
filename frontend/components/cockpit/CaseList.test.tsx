import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CaseList } from "./CaseList";
import { buildView } from "@/lib/cockpit-view";
import { seedCases } from "@/lib/cockpit-seed";

function rmView(selectedId: string | null = null) {
  return buildView({ role: "rm", cases: seedCases(), selectedId, msgTo: "am" });
}

describe("CaseList", () => {
  it("renders the kicker, title and the RM-owned rows", () => {
    render(<CaseList view={rmView()} onSelect={() => {}} />);
    expect(screen.getByText("Your book")).toBeInTheDocument();
    expect(screen.getByText("Helvetia Capital AG")).toBeInTheDocument();
    expect(screen.getByText("Castor Mining Ltd")).toBeInTheDocument();
  });

  it("titles the AM book", () => {
    render(<CaseList view={buildView({ role: "am", cases: seedCases(), selectedId: null, msgTo: "rm" })} onSelect={() => {}} />);
    expect(screen.getByText("Accounts you own")).toBeInTheDocument();
  });

  it("titles the Compliance inbox", () => {
    render(<CaseList view={buildView({ role: "compliance", cases: seedCases(), selectedId: null, msgTo: "rm" })} onSelect={() => {}} />);
    expect(screen.getByText("Escalations · ranked")).toBeInTheDocument();
  });

  it("renders the band badge and materiality for a row", () => {
    render(<CaseList view={rmView()} onSelect={() => {}} />);
    const row = screen.getByRole("button", { name: /Helvetia Capital AG/ });
    expect(within(row).getByText("HIGH")).toBeInTheDocument();
    expect(within(row).getByText("MAT 92")).toBeInTheDocument();
  });

  it("marks the selected row as pressed and leaves the others unpressed", () => {
    render(<CaseList view={rmView("helvetia")} onSelect={() => {}} />);
    expect(screen.getByRole("button", { name: /Helvetia Capital AG/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Castor Mining Ltd/ })).toHaveAttribute("aria-pressed", "false");
  });

  it("pulses an unread row only in the Compliance view", () => {
    render(
      <CaseList
        view={buildView({ role: "compliance", cases: seedCases(), selectedId: null, msgTo: "rm" })}
        onSelect={() => {}}
      />,
    );
    // Helvetia is the only seeded unread case; its row carries the unread marker.
    const row = screen.getByRole("button", { name: /Helvetia Capital AG/ });
    expect(within(row).getByLabelText("unread")).toBeInTheDocument();
    const castor = screen.getByRole("button", { name: /Castor Mining Ltd/ });
    expect(within(castor).queryByLabelText("unread")).toBeNull();
  });

  it("calls onSelect with the case id", async () => {
    const onSelect = vi.fn();
    render(<CaseList view={rmView()} onSelect={onSelect} />);
    await userEvent.click(screen.getByText("Helvetia Capital AG"));
    expect(onSelect).toHaveBeenCalledWith("helvetia");
  });

  it("shows the empty state when the list is empty", () => {
    const view = buildView({ role: "am", cases: [], selectedId: null, msgTo: "rm" });
    render(<CaseList view={view} onSelect={() => {}} />);
    expect(screen.getByText("Nothing assigned to you yet.")).toBeInTheDocument();
  });
});
