import { expect, test, describe } from "vitest";
import { wilsonCI, formatCI, isSignificant, computeCompositeScore, getLetterGrade, compareRuns } from "./stats";

describe("stats.ts characterization", () => {
  test("wilsonCI returns 0s for 0 total", () => {
    expect(wilsonCI(0, 0)).toEqual({ point: 0, lower: 0, upper: 0, interval: 0 });
  });

  test("wilsonCI computes expected interval", () => {
    const ci = wilsonCI(50, 100);
    expect(ci.point).toBe(0.5);
    expect(ci.lower).toBeGreaterThan(0.4);
    expect(ci.upper).toBeLessThan(0.6);
  });

  test("formatCI formats correctly", () => {
    const ci = wilsonCI(50, 100);
    const formatted = formatCI(ci, 1);
    expect(formatted).toMatch(/50.0% ± \d+\.\d+% \[\d+\.\d+–\d+\.\d+\]/);
  });

  test("isSignificant compares CIs", () => {
    const ciA = wilsonCI(10, 100);
    const ciB = wilsonCI(90, 100);
    expect(isSignificant(ciA, ciB)).toBe(true);

    const ciC = wilsonCI(50, 100);
    const ciD = wilsonCI(55, 100);
    expect(isSignificant(ciC, ciD)).toBe(false);
  });

  test("computeCompositeScore", () => {
    expect(computeCompositeScore({ passRate: 1, severity: "critical" })).toBe(0.55);
  });

  test("getLetterGrade", () => {
    expect(getLetterGrade(0.96)).toBe("A+");
    expect(getLetterGrade(0.5)).toBe("D+");
    expect(getLetterGrade(0.2)).toBe("F");
  });

  test("compareRuns", () => {
    const res = compareRuns({ passedTests: 10, totalTests: 100 }, { passedTests: 90, totalTests: 100 });
    expect(res.significant).toBe(true);
  });
});
