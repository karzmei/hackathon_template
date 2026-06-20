import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn (class merge)", () => {
  it("joins plain class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("drops falsy values (false, null, undefined, empty)", () => {
    expect(cn("base", false && "hidden", null, undefined, "", "end")).toBe(
      "base end",
    );
  });

  it("flattens arrays and objects like clsx", () => {
    expect(cn(["a", "b"], { c: true, d: false })).toBe("a b c");
  });

  it("dedupes conflicting Tailwind utilities, keeping the last", () => {
    // tailwind-merge resolves the conflict: a later px-* wins over an earlier one.
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-sm text-muted-foreground", "text-lg")).toBe(
      "text-muted-foreground text-lg",
    );
  });
});
