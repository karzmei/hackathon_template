import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EfficiencyCallout } from "./EfficiencyCallout";
import { costSeed } from "@/lib/cost-seed";
import { efficiency } from "@/lib/cost-view";

describe("EfficiencyCallout", () => {
  it("states the spend concentration and the cheap exits", () => {
    render(<EfficiencyCallout eff={efficiency(costSeed)} />);
    expect(
      screen.getByText(/94% of spend went to the 2 cases that drifted into an actionable risk band/),
    ).toBeInTheDocument();
    expect(screen.getByText(/3 immaterial cases/)).toBeInTheDocument();
    expect(screen.getByText("per actionable case")).toBeInTheDocument();
  });
});
