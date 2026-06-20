import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DetailPane } from "./DetailPane";
import { makeAlert } from "@/test/fixtures";

// ActionBar reaches the data layer on click; we never click here, but keep it offline.
vi.mock("@/lib/data", () => ({ decide: vi.fn().mockResolvedValue({}) }));

function follows(a: Element, b: Element) {
  return Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
}

describe("DetailPane", () => {
  it("renders the client header with jurisdiction and status", () => {
    render(<DetailPane alert={makeAlert()} onDecided={() => {}} />);
    expect(
      screen.getByRole("heading", { name: "Helvetia SaaS GmbH" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Needs review/)).toBeInTheDocument();
  });

  it("keeps the four UX sections in order: delta, dimensions, timeline, actions", () => {
    render(<DetailPane alert={makeAlert()} onDecided={() => {}} />);
    const delta = screen.getByText(/AGGREGATE DRIFT/);
    const dims = screen.getByText(/DRIFT BY DIMENSION/);
    const timeline = screen.getByText("SOURCE-CITED TIMELINE");
    const action = screen.getByRole("button", { name: "Approve Re-KYC" });

    expect(follows(delta, dims)).toBe(true);
    expect(follows(dims, timeline)).toBe(true);
    expect(follows(timeline, action)).toBe(true);
  });

  it("renders the audit trail under the actions", () => {
    render(<DetailPane alert={makeAlert()} onDecided={() => {}} />);
    expect(screen.getByText(/created by system/)).toBeInTheDocument();
  });
});
