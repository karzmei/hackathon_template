import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginScreen } from "./LoginScreen";

describe("LoginScreen", () => {
  it("renders the three seats with their roles", () => {
    render(<LoginScreen onPick={() => {}} />);
    expect(screen.getByText("Lena Brunner")).toBeInTheDocument();
    expect(screen.getByText("Relationship Manager")).toBeInTheDocument();
    expect(screen.getByText("Marco Reuss")).toBeInTheDocument();
    expect(screen.getByText("Sofia Keller")).toBeInTheDocument();
  });

  it("calls onPick with the chosen role", async () => {
    const onPick = vi.fn();
    render(<LoginScreen onPick={onPick} />);
    await userEvent.click(screen.getByText("Marco Reuss"));
    expect(onPick).toHaveBeenCalledWith("am");
  });
});
