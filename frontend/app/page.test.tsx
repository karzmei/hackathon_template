import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/lib/data", () => ({
  loadAlertRows: vi.fn(),
  loadAlert: vi.fn(),
  loadCostToday: vi.fn(),
  runPipeline: vi.fn(),
  decide: vi.fn(),
}));

import Cockpit from "./page";
import * as data from "@/lib/data";
import { mockAlertRows, mockAlerts, mockCostToday } from "@/lib/mock";
import type { Alert, RecommendedAction } from "@/lib/api";

let store: Record<string, Alert>;

beforeEach(() => {
  store = structuredClone(mockAlerts);
  vi.mocked(data.loadAlertRows).mockReset().mockResolvedValue(structuredClone(mockAlertRows));
  vi.mocked(data.loadCostToday).mockReset().mockResolvedValue({ ...mockCostToday });
  vi.mocked(data.runPipeline).mockReset().mockResolvedValue({ alerts: structuredClone(mockAlertRows) });
  vi.mocked(data.loadAlert).mockReset().mockImplementation((id: string) => Promise.resolve(store[id]));
  vi.mocked(data.decide)
    .mockReset()
    .mockImplementation((id: string, action: RecommendedAction) => {
      store[id] = {
        ...store[id],
        status: "actioned",
        audit: [
          ...store[id].audit,
          { entity_id: id, type: `decision:${action}`, actor: "analyst", payload: {}, at: "t" },
        ],
      };
      return Promise.resolve(store[id]);
    });
});

describe("Cockpit", () => {
  it("renders the queue and opens the first client by default", async () => {
    render(<Cockpit />);

    // detail heading for the default-selected first client
    expect(
      await screen.findByRole("heading", { name: "Helvetia SaaS GmbH" }),
    ).toBeInTheDocument();
    // every client appears in the rail (the selected one also shows in the detail)
    for (const row of mockAlertRows) {
      expect(screen.getAllByText(row.client_name).length).toBeGreaterThan(0);
    }
    // today's cost in the header
    expect(screen.getByText("$0.41")).toBeInTheDocument();
  });

  it("swaps the detail pane when another queue row is selected", async () => {
    render(<Cockpit />);
    await screen.findByRole("heading", { name: "Helvetia SaaS GmbH" });

    await userEvent.click(screen.getByRole("button", { name: /Meridian Capital AG/ }));

    expect(
      await screen.findByRole("heading", { name: "Meridian Capital AG" }),
    ).toBeInTheDocument();
  });

  it("runs the pipeline then refreshes", async () => {
    render(<Cockpit />);
    await screen.findByRole("heading", { name: "Helvetia SaaS GmbH" });

    await userEvent.click(screen.getByRole("button", { name: "Run pipeline" }));

    expect(data.runPipeline).toHaveBeenCalledTimes(1);
  });

  it("records a decision: status flips to Actioned and the audit grows", async () => {
    render(<Cockpit />);
    await screen.findByRole("heading", { name: "Helvetia SaaS GmbH" });

    await userEvent.click(screen.getByRole("button", { name: "Approve Re-KYC" }));

    expect(data.decide).toHaveBeenCalledWith("alert-helvetia", "re_kyc");
    expect(await screen.findByText("Actioned")).toBeInTheDocument();
    expect(screen.getByText(/decision by analyst/)).toBeInTheDocument();
  });

  it("shows an error when the initial load fails", async () => {
    vi.mocked(data.loadAlertRows).mockRejectedValue(new Error("API 500: boom"));
    render(<Cockpit />);
    expect(await screen.findByText("API 500: boom")).toBeInTheDocument();
  });
});
