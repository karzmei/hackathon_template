/// <reference types="vite/client" />
import { describe, it, expect } from "vitest";

// Quality guard (mirrors inc-b2c-mvp's no-bare-stub-tests): a test file that holds
// only `.todo` placeholders and no real assertion gives false coverage confidence.
// This fails the suite if any colocated test file is a bare stub. import.meta.glob
// is a Vite build-time macro and must be written as a literal call so Vite can
// transform it; the reference directive above supplies its type.
const sources = import.meta.glob("../**/*.test.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const TODO_RE = /\b(?:it|test|describe)\.todo\s*\(/;
const REAL_TEST_RE = /\b(?:it|test)\s*\(\s*["'`]/;

describe("no bare-stub test files", () => {
  it("found test files to scan", () => {
    expect(Object.keys(sources).length).toBeGreaterThan(0);
  });

  it("every test file contains at least one real (non-todo) test", () => {
    const offenders = Object.entries(sources)
      .filter(([, raw]) => TODO_RE.test(raw) && !REAL_TEST_RE.test(raw))
      .map(([path]) => path);
    expect(offenders).toEqual([]);
  });
});
