import { describe, it, expect } from "vitest";
import { cn, nowStamp, digestLabel } from "./utils";

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

// Fri 20 Jun 2025, 14:32 local time (month index 5 = June). Built from local
// components so the en-GB formatting is deterministic regardless of system zone.
const FIXED = new Date(2025, 5, 20, 14, 32);

describe("nowStamp (audit/message timestamp)", () => {
  it("formats day, short month and 24h time", () => {
    expect(nowStamp(FIXED)).toBe("20 Jun 14:32");
  });

  it("zero-pads the day and minutes", () => {
    expect(nowStamp(new Date(2025, 0, 3, 9, 5))).toBe("03 Jan 09:05");
  });
});

describe("digestLabel (RM morning digest kicker)", () => {
  it("renders the weekday, day and month for the given date in caps", () => {
    expect(digestLabel(FIXED)).toBe("MORNING DIGEST · FRI 20 JUN");
  });
});
