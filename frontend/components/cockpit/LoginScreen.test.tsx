import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginScreen } from "./LoginScreen";

describe("LoginScreen", () => {
  it("renders the three seats with their names and titles", () => {
    render(<LoginScreen onPick={() => {}} />);
    expect(screen.getByText("Lena Brunner")).toBeInTheDocument();
    expect(screen.getByText("Relationship Manager")).toBeInTheDocument();
    expect(screen.getByText("Marco Reuss")).toBeInTheDocument();
    expect(screen.getByText("Account Manager")).toBeInTheDocument();
    expect(screen.getByText("Sofia Keller")).toBeInTheDocument();
    expect(screen.getByText("Compliance Officer")).toBeInTheDocument();
  });

  it("describes the Compliance seat as the second-line control", () => {
    render(<LoginScreen onPick={() => {}} />);
    // "2ND LINE · CONTROL" appears in both the flow legend and the seat label.
    expect(screen.getAllByText("2ND LINE · CONTROL").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Escalations from the first line/)).toBeInTheDocument();
  });

  it("links to the shared cost dashboard", () => {
    render(<LoginScreen onPick={() => {}} />);
    const link = screen.getByRole("link", { name: /COST & EFFICIENCY DASHBOARD/ });
    expect(link).toHaveAttribute("href", "/dashboard");
  });

  it("calls onPick with each chosen role", async () => {
    const onPick = vi.fn();
    render(<LoginScreen onPick={onPick} />);
    await userEvent.click(screen.getByText("Lena Brunner"));
    await userEvent.click(screen.getByText("Marco Reuss"));
    await userEvent.click(screen.getByText("Sofia Keller"));
    expect(onPick.mock.calls.map((c) => c[0])).toEqual(["rm", "am", "compliance"]);
  });
});
