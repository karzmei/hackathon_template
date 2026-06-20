import { describe, it, expect } from "vitest";
import {
  bandTone,
  bandTextTone,
  toneToAccentVar,
  bandAccentVar,
} from "./risk";

describe("risk styling helpers", () => {
  describe("bandTone (RiskBandLevel -> tone)", () => {
    it("maps high -> danger, medium -> warning, low -> success", () => {
      expect(bandTone("high")).toBe("danger");
      expect(bandTone("medium")).toBe("warning");
      expect(bandTone("low")).toBe("success");
    });
  });

  describe("bandTextTone (textual band -> tone)", () => {
    it("reads the worst level named in the text, HIGH winning over MEDIUM", () => {
      // The transition "MEDIUM -> HIGH" should surface the destination (danger),
      // because the HIGH substring takes precedence.
      expect(bandTextTone("MEDIUM -> HIGH")).toBe("danger");
      expect(bandTextTone("LOW -> MEDIUM")).toBe("warning");
    });

    it("falls back to success when neither HIGH nor MEDIUM appears", () => {
      expect(bandTextTone("LOW -> LOW")).toBe("success");
      expect(bandTextTone("")).toBe("success");
    });
  });

  describe("toneToAccentVar (tone -> CSS variable)", () => {
    it("maps each semantic tone to its border CSS variable", () => {
      expect(toneToAccentVar("danger")).toBe("var(--color-border-danger)");
      expect(toneToAccentVar("warning")).toBe("var(--color-border-warning)");
      expect(toneToAccentVar("success")).toBe("var(--color-border-success)");
    });

    it("treats any non-danger, non-warning tone as the success accent", () => {
      expect(toneToAccentVar("info")).toBe("var(--color-border-success)");
      expect(toneToAccentVar("neutral")).toBe("var(--color-border-success)");
    });
  });

  describe("bandAccentVar (textual band -> accent variable)", () => {
    it("composes bandTextTone with toneToAccentVar", () => {
      expect(bandAccentVar("MEDIUM -> HIGH")).toBe("var(--color-border-danger)");
      expect(bandAccentVar("LOW -> MEDIUM")).toBe("var(--color-border-warning)");
      expect(bandAccentVar("LOW -> LOW")).toBe("var(--color-border-success)");
    });
  });
});
