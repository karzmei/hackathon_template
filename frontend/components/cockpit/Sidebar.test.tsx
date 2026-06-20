import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { Sidebar } from "./Sidebar";
import { buildView } from "@/lib/cockpit-view";
import { seedCases } from "@/lib/cockpit-seed";
import type { Role } from "@/lib/cockpit-types";

function navFor(role: Role) {
  return buildView({ role, cases: seedCases(), selectedId: null, msgTo: "am" }).nav;
}

function row(label: string): HTMLElement {
  return screen.getByText(label).parentElement as HTMLElement;
}

describe("Sidebar", () => {
  it("renders every nav label for the RM seat", () => {
    render(<Sidebar nav={navFor("rm")} />);
    for (const label of ["Morning digest", "My clients", "Escalated by me", "Compliance requests"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("renders the Compliance nav labels", () => {
    render(<Sidebar nav={navFor("compliance")} />);
    for (const label of ["Inbox", "In review", "Decided", "Audit log"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("shows the count as a plain numeral only when the item has a count", () => {
    render(<Sidebar nav={navFor("rm")} />);
    expect(within(row("My clients")).getByText("5")).toBeInTheDocument(); // five RM-owned clients
    // The digest entry has no count; it shows a dash placeholder, never a zero.
    expect(within(row("Morning digest")).queryByText("0")).toBeNull();
  });

  it("renders the overview items as informative, non-interactive rows", () => {
    render(<Sidebar nav={navFor("am")} />);
    expect(screen.getByText("OVERVIEW")).toBeInTheDocument();
    for (const label of ["Accounts I own", "Handed to me", "Escalated by me"]) {
      // No button/link wrapper: the row is display-only, not clickable.
      expect(screen.getByText(label).closest("button")).toBeNull();
      expect(screen.getByText(label).closest("a")).toBeNull();
    }
  });

  it("always renders the lines-of-defence legend and the live-sync indicator", () => {
    render(<Sidebar nav={navFor("am")} />);
    expect(screen.getByText("LINES OF DEFENCE")).toBeInTheDocument();
    expect(screen.getByText("1st · RM + AM (business)")).toBeInTheDocument();
    expect(screen.getByText("2nd · Compliance (control)")).toBeInTheDocument();
    expect(screen.getByText("3rd · MLRO (reporting)")).toBeInTheDocument();
    expect(screen.getByText(/SYNCED ACROSS THE TEAM/)).toBeInTheDocument();
  });
});
