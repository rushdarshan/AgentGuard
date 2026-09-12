import { describe, expect, it } from "vitest";
import { computeAgreement, MIN_PAIRED_CASES, type JudgeLabelRecord } from "./agreement.js";

const labels = (judgeId: string, ls: ("PASS" | "FAIL")[]): JudgeLabelRecord[] =>
  ls.map((label, i) => ({ caseKey: `c${i}`, judgeId, label }));

describe("computeAgreement", () => {
  it("computes Cohen's kappa for a known pair", () => {
    const s = computeAgreement([
      ...labels("a", ["PASS", "PASS", "PASS", "FAIL", "FAIL"]),
      ...labels("b", ["PASS", "PASS", "FAIL", "FAIL", "FAIL"]),
    ]);
    const p = s.pairs[0];
    expect(p.status).toBe("REPORTED");
    expect(p.observedAgreement).toBe(0.8);
    expect(p.expectedAgreement).toBe(0.48);
    expect(p.kappa).toBe(0.6154); // (0.8-0.48)/(1-0.48)
    expect(s.meanPairwiseKappa).toBe(0.6154);
    expect(s.includedPairs).toBe(1);
  });

  it("withholds kappa below the paired-case policy", () => {
    const s = computeAgreement([
      ...labels("a", ["PASS", "FAIL", "PASS", "FAIL"]),
      ...labels("b", ["PASS", "FAIL", "PASS", "FAIL"]),
    ]);
    expect(MIN_PAIRED_CASES).toBe(5);
    expect(s.pairs[0].status).toBe("INSUFFICIENT_PAIRED_CASES");
    expect(s.pairs[0].kappa).toBeNull();
    expect(s.meanPairwiseKappa).toBeNull();
  });

  it("withholds kappa without both label classes per judge", () => {
    const s = computeAgreement([
      ...labels("a", ["PASS", "PASS", "PASS", "PASS", "PASS"]),
      ...labels("b", ["PASS", "FAIL", "PASS", "FAIL", "PASS"]),
    ]);
    expect(s.pairs[0].status).toBe("INSUFFICIENT_LABEL_VARIATION");
  });

  it("three judges -> three pairs, unweighted mean", () => {
    const perfect = labels("z", ["PASS", "FAIL", "PASS", "FAIL", "PASS"]);
    const s = computeAgreement([
      ...labels("a", ["PASS", "FAIL", "PASS", "FAIL", "PASS"]),
      ...labels("b", ["PASS", "FAIL", "PASS", "FAIL", "PASS"]),
      ...perfect,
    ]);
    expect(s.pairs).toHaveLength(3);
    expect(s.pairs.every((p) => p.kappa === 1)).toBe(true);
    expect(s.meanPairwiseKappa).toBe(1);
  });

  it("rejects duplicate (case, judge) labels", () => {
    expect(() =>
      computeAgreement([...labels("a", ["PASS", "FAIL"]), ...labels("a", ["PASS", "PASS"])]),
    ).toThrow(/duplicate label/);
  });

  it("excludes broken-evidence cases and reports them", () => {
    const a = [
      { caseKey: "bad", judgeId: "a", label: "PASS" as const },
      ...labels("a", ["PASS", "FAIL", "PASS", "FAIL", "PASS"]),
    ];
    const b = [
      { caseKey: "bad", judgeId: "b", label: "PASS" as const },
      ...labels("b", ["PASS", "FAIL", "PASS", "FAIL", "PASS"]),
    ];
    const s = computeAgreement([...a, ...b], ["bad"]);
    expect(s.pairs[0].nPaired).toBe(5); // "bad" dropped, 5 remain
    expect(s.excludedBrokenEvidenceCases).toEqual(["bad"]);
  });
});
