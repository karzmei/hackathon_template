import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Cockpit from "./page";

// Full-page integration walk through the real page wiring (useCockpit -> buildView ->
// LoginScreen/AppHeader/CaseList/CaseDetail). Covers the journeys in docs/USER_JOURNEYS.md:
// FJ1 (seat picker), FJ2 (RM escalate), and FJ4 (Compliance decide) end to end. State is
// the cockpit's own localStorage store, cleared between cases for isolation.

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe("Cockpit page (end-to-end journeys)", () => {
  it("FJ1: opens on the seat picker and an RM lands on their ranked book", async () => {
    render(<Cockpit />);

    expect(await screen.findByText(/Who's on shift\?/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Lena Brunner/ }));

    expect(await screen.findByText("Your book")).toBeInTheDocument();
    // The RM book lists owned clients; the high-materiality cases are present.
    expect(screen.getByRole("button", { name: /Castor Mining Ltd/ })).toBeInTheDocument();
  });

  it("FJ2: an RM escalates a case and its status flips to awaiting Compliance", async () => {
    render(<Cockpit />);
    await userEvent.click(await screen.findByRole("button", { name: /Lena Brunner/ }));

    await userEvent.click(await screen.findByRole("button", { name: /Castor Mining Ltd/ }));
    expect(await screen.findByRole("heading", { name: "Castor Mining Ltd" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Escalate to Compliance/ }));

    // The new "flagged" status surfaces (row pill and/or detail header).
    expect((await screen.findAllByText(/Flagged · awaiting Compliance/)).length).toBeGreaterThan(0);
  });

  it("FJ4: Compliance opens a flagged case and decides Re-KYC", async () => {
    render(<Cockpit />);

    // Take the Compliance seat; Helvetia is seeded flagged_by_rm in the inbox.
    await userEvent.click(await screen.findByRole("button", { name: /Sofia Keller/ }));
    expect(await screen.findByText("Escalations · ranked")).toBeInTheDocument();

    await userEvent.click(await screen.findByRole("button", { name: /Helvetia Capital AG/ }));
    expect(await screen.findByRole("heading", { name: "Helvetia Capital AG" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Require Re-KYC/ }));

    expect((await screen.findAllByText(/Re-KYC required/)).length).toBeGreaterThan(0);
  });
});
