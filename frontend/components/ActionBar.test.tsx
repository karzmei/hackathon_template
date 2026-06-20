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
import { makeAlert } from "@/test/fixtures";

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

  it("shows the error and skips onDecided when decide rejects", async () => {
    vi.mocked(decide).mockRejectedValueOnce(new Error("Backend exploded"));
    const onDecided = vi.fn();
    render(<ActionBar alertId="alert-helvetia" onDecided={onDecided} />);

    await userEvent.click(screen.getByRole("button", { name: "Escalate to MLRO" }));

    expect(await screen.findByText("Backend exploded")).toBeInTheDocument();
    expect(onDecided).not.toHaveBeenCalled();
    // the buttons re-enable so the analyst can retry
    expect(screen.getByRole("button", { name: "Escalate to MLRO" })).toBeEnabled();
  });

  it("disables every action and shows Saving... while a decision is in flight", async () => {
    let release!: (alert: Awaited<ReturnType<typeof decide>>) => void;
    vi.mocked(decide).mockImplementationOnce(
      () => new Promise((resolve) => (release = resolve)),
    );
    const user = userEvent.setup();
    render(<ActionBar alertId="alert-helvetia" onDecided={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Approve Re-KYC" }));

    // the clicked button shows the pending label; all three are disabled
    expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Escalate to MLRO" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Dismiss as false positive" }),
    ).toBeDisabled();

    // settle the decision so React can flush the busy state cleanly
    release(makeAlert());
    expect(
      await screen.findByRole("button", { name: "Approve Re-KYC" }),
    ).toBeEnabled();
  });
});
