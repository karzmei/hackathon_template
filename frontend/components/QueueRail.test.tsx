import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueueRail } from "./QueueRail";
import { mockAlertRows } from "@/lib/mock";

describe("QueueRail", () => {
  it("renders the queue header with the row count and every client", () => {
    render(<QueueRail rows={mockAlertRows} selectedId="alert-helvetia" onSelect={() => {}} />);
    expect(screen.getByText(/Queue/)).toBeInTheDocument();
    expect(screen.getByText("- 6")).toBeInTheDocument();
    for (const row of mockAlertRows) {
      expect(screen.getByText(row.client_name)).toBeInTheDocument();
    }
  });

  it("marks the selected row with aria-current", () => {
    render(<QueueRail rows={mockAlertRows} selectedId="alert-meridian" onSelect={() => {}} />);
    const selected = screen.getByRole("button", { name: /Meridian Capital AG/ });
    expect(selected).toHaveAttribute("aria-current", "true");
    const other = screen.getByRole("button", { name: /Helvetia SaaS GmbH/ });
    expect(other).not.toHaveAttribute("aria-current");
  });

  it("fires onSelect with the row id when a row is clicked", async () => {
    const onSelect = vi.fn();
    render(<QueueRail rows={mockAlertRows} selectedId="alert-helvetia" onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("button", { name: /Alpine Logistics SA/ }));
    expect(onSelect).toHaveBeenCalledWith("alert-alpine");
  });
});
