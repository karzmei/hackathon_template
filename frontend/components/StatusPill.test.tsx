import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusPill } from "./StatusPill";

describe("StatusPill", () => {
  it("renders the human label for actioned", () => {
    render(<StatusPill status="actioned" />);
    expect(screen.getByText("Actioned")).toBeInTheDocument();
  });

  it("renders the human label for needs_review", () => {
    render(<StatusPill status="needs_review" />);
    expect(screen.getByText("Needs review")).toBeInTheDocument();
  });
});
