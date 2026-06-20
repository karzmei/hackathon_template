import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CascadeFunnel } from "./CascadeFunnel";
import { costSeed } from "@/lib/cost-seed";
import { stageBars } from "@/lib/cost-view";

describe("CascadeFunnel", () => {
  it("renders a row per stage with its label and model", () => {
    render(<CascadeFunnel bars={stageBars(costSeed)} />);
    expect(screen.getByText("Cheap rules")).toBeInTheDocument();
    expect(screen.getByText("Reasoning filter")).toBeInTheDocument();
    expect(screen.getByText("Deep analysis")).toBeInTheDocument();
    expect(screen.getByText("no LLM")).toBeInTheDocument();
    expect(screen.getByText("gpt-4o")).toBeInTheDocument();
  });

  it("shows the attrition and the deep stage dominating spend", () => {
    render(<CascadeFunnel bars={stageBars(costSeed)} />);
    expect(screen.getByLabelText("8 entered, 5 survived")).toBeInTheDocument();
    expect(screen.getByLabelText("Deep analysis: 94% of spend")).toBeInTheDocument();
  });
});
