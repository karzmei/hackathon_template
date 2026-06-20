import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ModelSplit } from "./ModelSplit";
import { costSeed } from "@/lib/cost-seed";
import { modelRows } from "@/lib/cost-view";

describe("ModelSplit", () => {
  it("lists each model tier with its spend share", () => {
    render(<ModelSplit rows={modelRows(costSeed)} />);
    expect(screen.getByText("gpt-4o-mini")).toBeInTheDocument();
    expect(screen.getByText("gpt-4o")).toBeInTheDocument();
    expect(screen.getByText("94% of spend")).toBeInTheDocument();
    expect(screen.getByText("6% of spend")).toBeInTheDocument();
  });
});
