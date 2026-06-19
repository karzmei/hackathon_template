import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock the API module so the decision flow is offline; the component awaits api.decide
// then calls onDecided.
vi.mock("@/lib/api", () => ({
  api: { decide: vi.fn().mockResolvedValue({}) },
}));

import { ActionBar } from "./ActionBar";
import { api } from "@/lib/api";

describe("ActionBar", () => {
  beforeEach(() => {
    vi.mocked(api.decide).mockClear();
  });

  it("renders the three decision actions", () => {
    render(<ActionBar alertId="helvetia" onDecided={() => {}} />);
    expect(screen.getByRole("button", { name: "Approve Re-KYC" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Escalate to MLRO" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Dismiss as false positive" }),
    ).toBeInTheDocument();
  });

  it("calls api.decide with re_kyc and then onDecided when approving", async () => {
    const onDecided = vi.fn();
    render(<ActionBar alertId="helvetia" onDecided={onDecided} />);

    await userEvent.click(screen.getByRole("button", { name: "Approve Re-KYC" }));

    expect(api.decide).toHaveBeenCalledWith("helvetia", "re_kyc");
    expect(onDecided).toHaveBeenCalledTimes(1);
  });
});
