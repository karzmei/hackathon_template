import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppHeader } from "./AppHeader";
import { buildView } from "@/lib/cockpit-view";
import { seedCases } from "@/lib/cockpit-seed";
import type { Role } from "@/lib/cockpit-types";

function headerView(role: Role, cases = seedCases()) {
  return buildView({ role, cases, selectedId: null, msgTo: role === "compliance" ? "rm" : "am" });
}

describe("AppHeader", () => {
  it("renders the role badge with name, title and line of defence", () => {
    render(<AppHeader view={headerView("rm")} onLogout={() => {}} />);
    expect(screen.getByText("Lena Brunner")).toBeInTheDocument();
    expect(screen.getByText("Relationship Manager")).toBeInTheDocument();
    expect(screen.getByText("1ST LINE · BUSINESS")).toBeInTheDocument();
  });

  it("shows the Compliance inbox pill with the unread pulse and count", () => {
    render(<AppHeader view={headerView("compliance")} onLogout={() => {}} />);
    expect(screen.getByText("Inbox")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument(); // one seeded unread case
    expect(screen.getByLabelText("unread escalations")).toBeInTheDocument();
  });

  it("hides the inbox pill for the first-line roles", () => {
    render(<AppHeader view={headerView("rm")} onLogout={() => {}} />);
    expect(screen.queryByText("Inbox")).toBeNull();
  });

  it("drops the unread pulse when the inbox has no unread cases", () => {
    const read = seedCases().map((c) => ({ ...c, unread: false }));
    render(<AppHeader view={headerView("compliance", read)} onLogout={() => {}} />);
    expect(screen.getByText("Inbox")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.queryByLabelText("unread escalations")).toBeNull();
  });

  it("invokes onLogout when SWITCH ROLE is clicked", async () => {
    const onLogout = vi.fn();
    render(<AppHeader view={headerView("am")} onLogout={onLogout} />);
    await userEvent.click(screen.getByRole("button", { name: "SWITCH ROLE" }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});
