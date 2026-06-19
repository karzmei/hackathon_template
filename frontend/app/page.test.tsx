import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/lib/api", () => ({
  api: {
    listAlerts: vi.fn(),
    costToday: vi.fn(),
    runPipeline: vi.fn(),
  },
}));

import QueuePage from "./page";
import { api } from "@/lib/api";
import { makeAlertRow } from "@/test/fixtures";

const cost = { tokens_in: 100, tokens_out: 50, usd: 0.0013, alerts: 1 };

beforeEach(() => {
  vi.mocked(api.listAlerts).mockReset().mockResolvedValue([]);
  vi.mocked(api.costToday).mockReset().mockResolvedValue(cost);
  vi.mocked(api.runPipeline).mockReset().mockResolvedValue({ alerts: [] });
});

describe("QueuePage", () => {
  it("shows the empty state when there are no alerts", async () => {
    render(<QueuePage />);
    expect(await screen.findByText(/No alerts yet/)).toBeInTheDocument();
  });

  it("renders a row and the today cost chip after load", async () => {
    vi.mocked(api.listAlerts).mockResolvedValue([makeAlertRow()]);
    render(<QueuePage />);

    expect(await screen.findByText("Helvetia SaaS GmbH")).toBeInTheDocument();
    expect(screen.getByText(/today/)).toBeInTheDocument();
  });

  it("runs the pipeline then refreshes the queue", async () => {
    vi.mocked(api.listAlerts)
      .mockResolvedValueOnce([]) // initial load
      .mockResolvedValue([makeAlertRow()]); // after run
    render(<QueuePage />);
    await screen.findByText(/No alerts yet/);

    await userEvent.click(screen.getByRole("button", { name: "Run pipeline" }));

    expect(api.runPipeline).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Helvetia SaaS GmbH")).toBeInTheDocument();
  });

  it("shows an error message when loading fails", async () => {
    vi.mocked(api.listAlerts).mockRejectedValue(new Error("API 500: boom"));
    render(<QueuePage />);
    expect(await screen.findByText("API 500: boom")).toBeInTheDocument();
  });
});
