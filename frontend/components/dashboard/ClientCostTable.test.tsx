import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ClientCostTable } from "./ClientCostTable";
import { costSeed } from "@/lib/cost-seed";
import { clientRows } from "@/lib/cost-view";

describe("ClientCostTable", () => {
  it("renders every client with its depth, band and spend", () => {
    render(<ClientCostTable rows={clientRows(costSeed)} />);
    expect(screen.getByText("Helvetia SaaS GmbH")).toBeInTheDocument();
    expect(screen.getByText("Lakeside Trading AG")).toBeInTheDocument();
    // The hero case reached the deep stage.
    expect(screen.getAllByText("step 3").length).toBe(2);
    expect(screen.getAllByText("high").length).toBe(2);
  });

  it("leads with the most expensive client", () => {
    render(<ClientCostTable rows={clientRows(costSeed)} />);
    const firstRow = screen.getAllByRole("row")[1]; // row 0 is the header
    expect(firstRow).toHaveTextContent("Helvetia SaaS GmbH");
  });
});
