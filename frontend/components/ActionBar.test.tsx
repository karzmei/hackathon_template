import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock the data layer so the decision flow is offline; the component awaits decide
// then calls onDecided.
vi.mock("@/lib/data", () => ({
  decide: vi.fn().mockResolvedValue({}),
}));

import { ActionBar } from "./ActionBar";
import { decide } from "@/lib/data";

describe("ActionBar", () => {
  beforeEach(() => {
    vi.mocked(decide).mockClear();
  });

  it("renders the three decision actions", () => {
    render(<ActionBar alertId="alert-helvetia" onDecided={() => {}} />);
    expect(screen.getByRole("button", { name: "Approve Re-KYC" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Escalate to MLRO" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Dismiss as false positive" }),
    ).toBeInTheDocument();
  });

  it("calls decide with re_kyc and then onDecided when approving", async () => {
    const onDecided = vi.fn();
    render(<ActionBar alertId="alert-helvetia" onDecided={onDecided} />);

    await userEvent.click(screen.getByRole("button", { name: "Approve Re-KYC" }));

    expect(decide).toHaveBeenCalledWith("alert-helvetia", "re_kyc");
    expect(onDecided).toHaveBeenCalledTimes(1);
  });
});
