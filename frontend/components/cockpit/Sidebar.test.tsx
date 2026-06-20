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

  it("shows a count badge only when the item has a count", () => {
    render(<Sidebar nav={navFor("rm")} />);
    expect(within(row("My clients")).getByText("5")).toBeInTheDocument(); // five RM-owned clients
    // The digest entry hides its count; only the label is present.
    expect(within(row("Morning digest")).queryByText("0")).toBeNull();
  });

  it("weights the active item and leaves the others lighter", () => {
    render(<Sidebar nav={navFor("rm")} />);
    expect(row("Morning digest").style.fontWeight).toBe("500"); // active
    expect(row("My clients").style.fontWeight).toBe("400"); // inactive
  });

  it("always renders the lines-of-defence legend and the cross-window notice", () => {
    render(<Sidebar nav={navFor("am")} />);
    expect(screen.getByText("LINES OF DEFENCE")).toBeInTheDocument();
    expect(screen.getByText("1st · RM + AM (business)")).toBeInTheDocument();
    expect(screen.getByText("2nd · Compliance (control)")).toBeInTheDocument();
    expect(screen.getByText(/SHARED CASE STATE/)).toBeInTheDocument();
  });
});
