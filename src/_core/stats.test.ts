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

  test("wilsonCI clamps at 1.0 for high pass rate", () => {
    const ci = wilsonCI(100, 100);
    expect(ci.upper).toBeLessThanOrEqual(1);
    expect(ci.point).toBe(1);
  });

  test("wilsonCI lower >= 0", () => {
    const ci = wilsonCI(1, 1000);
    expect(ci.lower).toBeGreaterThanOrEqual(0);
  });

  test("formatCI formats correctly", () => {
    const ci = wilsonCI(50, 100);
    const formatted = formatCI(ci, 1);
    expect(formatted).toMatch(/50.0% ± \d+\.\d+% \[\d+\.\d+–\d+\.\d+\]/);
  });

  test("formatCI respects decimals param", () => {
    const ci = wilsonCI(50, 100);
    const formatted = formatCI(ci, 0);
    expect(formatted).toMatch(/50%/);
  });

  test("isSignificant compares CIs", () => {
    const ciA = wilsonCI(10, 100);
    const ciB = wilsonCI(90, 100);
    expect(isSignificant(ciA, ciB)).toBe(true);

    const ciC = wilsonCI(50, 100);
    const ciD = wilsonCI(55, 100);
    expect(isSignificant(ciC, ciD)).toBe(false);
  });

  test("computeCompositeScore weights correctly", () => {
    const score = computeCompositeScore({ passRate: 1, severity: "critical" });
    expect(score).toBe(0.55); // 0.4*1 + 0.15*1 = 0.55
  });

  test("computeCompositeScore with all params", () => {
    const score = computeCompositeScore({
      passRate: 0.8,
      cascadeImpact: 0.5,
      piiLeakRate: 0.2,
      severity: "high",
    });
    // 0.4*0.8 + 0.25*0.5 + 0.2*0.2 + 0.15*0.7 = 0.59
    expect(score).toBeCloseTo(0.59, 3);
  });

  test("computeCompositeScore defaults optional params to 0", () => {
    const score = computeCompositeScore({ passRate: 0.5, severity: "low" });
    expect(score).toBeCloseTo(0.215, 3); // 0.4*0.5 + 0.15*0.1
  });

  test("getLetterGrade", () => {
    expect(getLetterGrade(0.96)).toBe("A+");
    expect(getLetterGrade(0.91)).toBe("A");
    expect(getLetterGrade(0.86)).toBe("A-");
    expect(getLetterGrade(0.81)).toBe("B+");
    expect(getLetterGrade(0.76)).toBe("B");
    expect(getLetterGrade(0.71)).toBe("B-");
    expect(getLetterGrade(0.66)).toBe("C+");
    expect(getLetterGrade(0.61)).toBe("C");
    expect(getLetterGrade(0.56)).toBe("C-");
    expect(getLetterGrade(0.5)).toBe("D+");
    expect(getLetterGrade(0.45)).toBe("D");
    expect(getLetterGrade(0.2)).toBe("F");
  });

  test("compareRuns", () => {
    const res = compareRuns({ passedTests: 10, totalTests: 100 }, { passedTests: 90, totalTests: 100 });
    expect(res.significant).toBe(true);
    expect(res.a.point).toBe(0.1);
    expect(res.b.point).toBe(0.9);
  });

  test("compareRuns with labels", () => {
    const res = compareRuns(
      { passedTests: 50, totalTests: 100, label: "v1" },
      { passedTests: 70, totalTests: 100, label: "v2" }
    );
    expect(res.a.point).toBe(0.5);
    expect(res.b.point).toBe(0.7);
  });
});
