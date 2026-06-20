import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CaseList } from "./CaseList";
import { buildView } from "@/lib/cockpit-view";
import { seedCases } from "@/lib/cockpit-seed";

function rmView() {
  return buildView({ role: "rm", cases: seedCases(), selectedId: null, msgTo: "am" });
}

describe("CaseList", () => {
  it("renders the kicker, title and the RM-owned rows", () => {
    render(<CaseList view={rmView()} onSelect={() => {}} />);
    expect(screen.getByText("Your book")).toBeInTheDocument();
    expect(screen.getByText("Helvetia Capital AG")).toBeInTheDocument();
    expect(screen.getByText("Castor Mining Ltd")).toBeInTheDocument();
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
