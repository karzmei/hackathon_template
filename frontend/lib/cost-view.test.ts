// @unit
import { describe, it, expect } from "vitest";
import { costSeed } from "./cost-seed";
import {
  clientRows,
  compositionSplit,
  efficiency,
  formatPct,
  formatTokens,
  formatUsd,
  modelRows,
  stageBars,
} from "./cost-view";

describe("cost-view formatting", () => {
  it("formats sub-cent USD with four decimals and a cent or more with two", () => {
    expect(formatUsd(0)).toBe("$0.00");
    expect(formatUsd(0.002656)).toBe("$0.0027");
    expect(formatUsd(0.0199)).toBe("$0.02");
    expect(formatUsd(0.01022)).toBe("$0.01");
  });

  it("compacts token counts above a thousand", () => {
    expect(formatTokens(750)).toBe("750");
    expect(formatTokens(9800)).toBe("9.8k");
    expect(formatTokens(11590)).toBe("11.6k");
  });

  it("rounds fractions to whole percents", () => {
    expect(formatPct(0.9365)).toBe("94%");
    expect(formatPct(0)).toBe("0%");
  });
});

describe("compositionSplit", () => {
  it("splits total tokens into prompt and completion shares", () => {
    const c = compositionSplit(costSeed);
    expect(c.tokensIn).toBe(9800);
    expect(c.tokensOut).toBe(1790);
    expect(c.total).toBe(11590);
    expect(formatPct(c.inFraction)).toBe("85%");
    expect(formatPct(c.outFraction)).toBe("15%");
  });
});

describe("stageBars", () => {
  it("derives the cost share per cascade stage", () => {
    const bars = stageBars(costSeed);
    expect(bars.map((b) => b.stage)).toEqual(["rules", "reasoning", "deep"]);
    const [rules, reasoning, deep] = bars;
    expect(rules.usdPct).toBe("0%");
    expect(rules.entered).toBe(8);
    expect(rules.survived).toBe(5);
    expect(rules.model).toBeNull();
    expect(reasoning.usdPct).toBe("6%");
    expect(deep.usdPct).toBe("94%");
    expect(deep.tone).toBe("danger");
  });
});

describe("modelRows", () => {
  it("lists only the LLM stages with their tier spend", () => {
    const rows = modelRows(costSeed);
    expect(rows.map((r) => r.model)).toEqual(["gpt-4o-mini", "gpt-4o"]);
    expect(rows[1].usdPct).toBe("94%");
  });
});

describe("clientRows", () => {
  it("sorts clients by spend, expensive first, and maps the band tone", () => {
    const rows = clientRows(costSeed);
    expect(rows[0].clientName).toBe("Helvetia SaaS GmbH");
    expect(rows[0].usdText).toBe("$0.01");
    expect(rows[0].bandTone).toBe("danger");
    expect(rows[rows.length - 1].usd).toBe(0);
    // The two HIGH cases carry the most spend.
    expect(rows[0].band).toBe("high");
    expect(rows[1].band).toBe("high");
  });
});

describe("efficiency", () => {
  it("derives the concentration and per-case ratios", () => {
    const e = efficiency(costSeed);
    expect(e.deepSpendShare).toBe("94%");
    expect(e.actionableAlerts).toBe(2);
    expect(e.usdPerActionableText).toBe("$0.01");
    expect(e.usdPerAlertText).toBe("$0.0027");
    expect(e.cheapExits).toBe(3);
  });
});
