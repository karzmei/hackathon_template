import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AlertTriangle } from "lucide-react";
import { SeverityBadge } from "./severity-badge";

describe("SeverityBadge", () => {
  it("renders the label text", () => {
    render(<SeverityBadge tone="success" label="Actioned" />);
    expect(screen.getByText("Actioned")).toBeInTheDocument();
  });

  it("applies the tone's CSS-variable colours via inline style", () => {
    render(<SeverityBadge tone="danger" label="High" />);
    const outer = screen.getByText("High").parentElement as HTMLElement;
    expect(outer.style.background).toBe("var(--color-background-danger)");
    expect(outer.style.borderColor).toBe("var(--color-border-danger)");
    expect(outer.style.color).toBe("var(--color-text-danger)");
  });

  it("uses the warning palette for a warning tone", () => {
    render(<SeverityBadge tone="warning" label="Review" />);
    const outer = screen.getByText("Review").parentElement as HTMLElement;
    expect(outer.style.color).toBe("var(--color-text-warning)");
  });

  it("renders an optional icon marked aria-hidden", () => {
    const { container } = render(
      <SeverityBadge tone="danger" label="High" icon={AlertTriangle} />,
    );
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute("aria-hidden");
  });

  it("omits the icon when none is given", () => {
    const { container } = render(
      <SeverityBadge tone="neutral" label="New" />,
    );
    expect(container.querySelector("svg")).toBeNull();
  });
});
