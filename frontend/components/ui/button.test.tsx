import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./button";

describe("Button", () => {
  it("renders a native button with its children", () => {
    render(<Button>Run pipeline</Button>);
    expect(
      screen.getByRole("button", { name: "Run pipeline" }),
    ).toBeInTheDocument();
  });

  it("applies the variant class (default vs brand)", () => {
    const { rerender } = render(<Button>Go</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-primary");

    rerender(<Button variant="brand">Go</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-black");
  });

  it("merges a caller className with the variant classes", () => {
    render(<Button className="w-full">Go</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toHaveClass("w-full");
    expect(btn).toHaveClass("bg-primary");
  });

  it("fires onClick when pressed", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Go" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not fire onClick when disabled", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Go
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "Go" });
    expect(btn).toBeDisabled();
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });
});
