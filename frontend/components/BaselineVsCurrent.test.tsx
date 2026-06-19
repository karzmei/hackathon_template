import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BaselineVsCurrent } from "./BaselineVsCurrent";
import type { Profile } from "@/lib/api";

function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    client_id: "helvetia",
    business_model: "B2B SaaS",
    expected_activity: "subscription revenue",
    expected_volume_band: "low",
    owners: [
      { name: "Anna", pct: 60, screened: true },
      { name: "Ben", pct: 40, screened: true },
    ],
    legal_form: "GmbH",
    domain: "helvetia.example",
    risk_rating: "low",
    ...overrides,
  };
}

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
