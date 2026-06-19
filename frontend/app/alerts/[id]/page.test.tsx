import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/lib/api", () => ({
  api: { getAlert: vi.fn(), decide: vi.fn() },
}));
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "alert-helvetia" }),
}));

import AlertDetailPage from "./page";
import { api } from "@/lib/api";
import { makeAlert } from "@/test/fixtures";

beforeEach(() => {
  vi.mocked(api.getAlert).mockReset().mockResolvedValue(makeAlert());
  vi.mocked(api.decide).mockReset().mockResolvedValue(makeAlert({ status: "actioned" }));
});

describe("AlertDetailPage", () => {
  it("loads and renders the case file sections in order", async () => {
    render(<AlertDetailPage />);

    expect(await screen.findByText("Helvetia SaaS GmbH")).toBeInTheDocument();
    // Risk delta first, then baseline-vs-current, then the timeline.
    const risk = screen.getByText(/Re-KYC recommended/);
    const baseline = screen.getByText("Baseline vs current");
    const timeline = screen.getByText("Source-cited timeline");
    expect(risk.compareDocumentPosition(baseline) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(baseline.compareDocumentPosition(timeline) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText("Audit trail")).toBeInTheDocument();
  });

  it("shows an error message when the fetch fails", async () => {
    vi.mocked(api.getAlert).mockRejectedValue(new Error("API 404: alert not found"));
    render(<AlertDetailPage />);
    expect(await screen.findByText("API 404: alert not found")).toBeInTheDocument();
  });

  it("refetches the alert after a decision", async () => {
    render(<AlertDetailPage />);
    await screen.findByText("Helvetia SaaS GmbH");
    expect(api.getAlert).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole("button", { name: "Approve Re-KYC" }));

    expect(api.decide).toHaveBeenCalledWith("alert-helvetia", "re_kyc");
    expect(api.getAlert).toHaveBeenCalledTimes(2); // refresh via onDecided
  });
});
