import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BaselineVsCurrent } from "./BaselineVsCurrent";
import { makeProfile as profile } from "@/test/fixtures";

describe("BaselineVsCurrent", () => {
  it("renders both the baseline and current value for a changed dimension", () => {
    const baseline = profile();
    const current = profile({ business_model: "Crypto OTC desk" });

    render(<BaselineVsCurrent baseline={baseline} current={current} />);

    expect(screen.getByText("B2B SaaS")).toBeInTheDocument();
    expect(screen.getByText("Crypto OTC desk")).toBeInTheDocument();
  });

  it("labels ownership with the unscreened count", () => {
    const baseline = profile();
    const current = profile({
      owners: [
        { name: "Anna", pct: 40, screened: true },
        { name: "Ben", pct: 30, screened: true },
        { name: "Nordwind Holdings", pct: 30, screened: false },
      ],
    });

    render(<BaselineVsCurrent baseline={baseline} current={current} />);

    expect(screen.getByText("2 owners")).toBeInTheDocument();
    expect(screen.getByText("3 owners (1 unscreened)")).toBeInTheDocument();
  });
});
