import { describe, it, expect } from "vitest";
import {
  bandLevelFromText,
  confTone,
  depthLabel,
  dimensionRows,
  driftPctLabel,
  levelColor,
  markerPct,
  sparkHeights,
} from "./cockpit";
import { makeDriftScore } from "@/test/fixtures";

describe("depthLabel", () => {
  it("@unit maps the cascade depth to a label", () => {
    expect(depthLabel(1)).toBe("FAST");
    expect(depthLabel(2)).toBe("STD");
    expect(depthLabel(3)).toBe("DEEP");
    expect(depthLabel(5)).toBe("DEEP");
  });
});

describe("confTone", () => {
  it("@unit is success at/above 0.75 and warning below", () => {
    expect(confTone(0.75)).toBe("success");
    expect(confTone(0.95)).toBe("success");
    expect(confTone(0.74)).toBe("warning");
    expect(confTone(0)).toBe("warning");
  });
});

describe("markerPct", () => {
  it("@unit converts an aggregate 0..1 to a clamped percentage", () => {
    expect(markerPct(0.82)).toBe(82);
    expect(markerPct(0)).toBe(0);
    expect(markerPct(1.4)).toBe(100);
    expect(markerPct(-0.2)).toBe(0);
  });
});

describe("bandLevelFromText", () => {
  it("@unit reads the level from the words in the band", () => {
    expect(bandLevelFromText("MEDIUM -> HIGH")).toBe("high");
    expect(bandLevelFromText("LOW -> MEDIUM")).toBe("medium");
    expect(bandLevelFromText("LOW")).toBe("low");
  });
});

describe("levelColor", () => {
  it("@unit maps each level to its semantic accent variable", () => {
    expect(levelColor("high")).toContain("danger");
    expect(levelColor("medium")).toContain("warning");
    expect(levelColor("low")).toContain("success");
  });
});

describe("sparkHeights", () => {
  it("@unit scales to percent and floors tiny values to stay visible", () => {
    expect(sparkHeights([1, 0.5])).toEqual([100, 50]);
    expect(sparkHeights([0])[0]).toBe(8);
    expect(sparkHeights([2])[0]).toBe(100); // clamped to 1
  });
});

describe("driftPctLabel", () => {
  it("@unit averages the sparkline and signs by trend", () => {
    expect(driftPctLabel([0.9, 0.8, 0.85, 0.6, 0.9], "up")).toBe("81%");
    expect(driftPctLabel([0.1, 0.05, 0.1, 0.0, 0.05], "down")).toBe("-6%");
    expect(driftPctLabel([], "flat")).toBe("0%");
  });
});

describe("dimensionRows", () => {
  it("@unit builds bar width, percent and changed flag per dimension", () => {
    const drift = makeDriftScore({
      per_dimension: [
        { dimension: "Business model", from: "SaaS", to: "OTC", delta: 0.95, weight: 1 },
        { dimension: "Jurisdiction", from: "CH", to: "CH", delta: 0, weight: 1 },
      ],
    });
    const rows = dimensionRows(drift);
    expect(rows[0]).toMatchObject({ pct: "95%", width: "95%", level: "high", changed: true });
    expect(rows[1]).toMatchObject({ pct: "0%", changed: false });
    // unchanged dimensions keep a visible floor width
    expect(rows[1].width).toBe("5%");
  });
});
