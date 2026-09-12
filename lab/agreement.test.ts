import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  agreementRecordDigest,
  computeAgreement,
  MIN_PAIRED_CASES,
  readAgreementRecord,
  writeAgreementRecord,
  type JudgeLabelRecord,
} from "./agreement.js";

const labels = (judgeId: string, ls: ("PASS" | "FAIL")[], brokenEvidence = false): JudgeLabelRecord[] =>
  ls.map((label, i) => ({ caseKey: `c${i}`, judgeId, label, brokenEvidence }));

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
    expect(p.contributingCaseIds).toEqual(["c0", "c1", "c2", "c3", "c4"]);
    expect(p.contingency).toEqual({ passPass: 2, passFail: 1, failPass: 0, failFail: 2 });
    expect(p.excluded).toEqual([]);
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
    expect(s.pairs[0].contingency).toEqual({ passPass: 2, passFail: 0, failPass: 0, failFail: 2 });
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

  it("duplicate (case, judge) labels are excluded as DUPLICATE_LABEL, first wins", () => {
    const s = computeAgreement([
      ...labels("a", ["PASS", "FAIL", "PASS", "FAIL", "PASS"]),
      ...labels("b", ["PASS", "FAIL", "PASS", "FAIL", "PASS"]),
      { caseKey: "c0", judgeId: "a", label: "FAIL", brokenEvidence: false },
    ]);
    const p = s.pairs[0];
    expect(p.excluded.some((e) => e.caseKey === "c0" && e.reason === "DUPLICATE_LABEL")).toBe(true);
    expect(p.contributingCaseIds).not.toContain("c0");
  });

  it("ABSTAIN and MISSING are excluded as NO_VALID_LABEL and counted", () => {
    const a: JudgeLabelRecord[] = [
      { caseKey: "abs", judgeId: "a", label: "ABSTAIN", brokenEvidence: false },
      ...labels("a", ["PASS", "FAIL", "PASS", "FAIL", "PASS"]),
    ];
    const b: JudgeLabelRecord[] = [
      { caseKey: "abs", judgeId: "b", label: "PASS", brokenEvidence: false },
      ...labels("b", ["PASS", "FAIL", "PASS", "FAIL", "PASS"]),
    ];
    const s = computeAgreement([...a, ...b]);
    const p = s.pairs[0];
    expect(p.nPaired).toBe(5);
    expect(p.excluded.some((e) => e.caseKey === "abs" && e.reason === "NO_VALID_LABEL")).toBe(true);
  });

  it("EVALUATOR_ERROR cases are excluded as JUDGE_ERROR and reported separately", () => {
    const a: JudgeLabelRecord[] = [
      { caseKey: "err", judgeId: "a", label: "EVALUATOR_ERROR", brokenEvidence: false },
      ...labels("a", ["PASS", "FAIL", "PASS", "FAIL", "PASS"]),
    ];
    const b: JudgeLabelRecord[] = [
      { caseKey: "err", judgeId: "b", label: "PASS", brokenEvidence: false },
      ...labels("b", ["PASS", "FAIL", "PASS", "FAIL", "PASS"]),
    ];
    const s = computeAgreement([...a, ...b]);
    expect(s.pairs[0].excluded.some((e) => e.caseKey === "err" && e.reason === "JUDGE_ERROR")).toBe(true);
    expect(s.evaluatorErrorCases).toEqual(["err"]);
  });

  it("broken-evidence cases are excluded as BROKEN_EVIDENCE and reported", () => {
    const a = [
      { caseKey: "bad", judgeId: "a", label: "PASS" as const, brokenEvidence: true },
      ...labels("a", ["PASS", "FAIL", "PASS", "FAIL", "PASS"]),
    ];
    const b = [
      { caseKey: "bad", judgeId: "b", label: "PASS" as const, brokenEvidence: true },
      ...labels("b", ["PASS", "FAIL", "PASS", "FAIL", "PASS"]),
    ];
    const s = computeAgreement([...a, ...b]);
    expect(s.pairs[0].nPaired).toBe(5); // "bad" dropped, 5 remain
    expect(s.pairs[0].excluded.some((e) => e.caseKey === "bad" && e.reason === "BROKEN_EVIDENCE")).toBe(true);
    expect(s.brokenEvidenceCases).toEqual(["bad"]);
  });

  it("a fused-ABSTAIN case still contributes when both judges hold valid labels", () => {
    // The analysis never sees fused outcomes: valid individual labels score.
    const s = computeAgreement([
      ...labels("a", ["PASS", "FAIL", "PASS", "FAIL", "PASS"]),
      ...labels("b", ["FAIL", "PASS", "FAIL", "PASS", "FAIL"]),
    ]);
    expect(s.pairs[0].nPaired).toBe(5);
    expect(s.pairs[0].contributingCaseIds).toHaveLength(5);
  });
});

describe("agreement record persistence", () => {
  it("round-trips byte-identically with a stable digest", () => {
    const root = mkdtempSync(join(tmpdir(), "lab-agree-"));
    try {
      const summary = computeAgreement([
        ...labels("a", ["PASS", "FAIL", "PASS", "FAIL", "PASS"]),
        ...labels("b", ["PASS", "FAIL", "PASS", "FAIL", "PASS"]),
      ]);
      writeAgreementRecord(root, "exp", summary);
      const back = readAgreementRecord(root, "exp");
      expect(back.summary).toEqual(summary);
      expect(agreementRecordDigest(back)).toBe(agreementRecordDigest({ schemaVersion: 1, experimentId: "exp", summary }));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("missing record fails instead of skipping", () => {
    const root = mkdtempSync(join(tmpdir(), "lab-agree-"));
    try {
      expect(() => readAgreementRecord(root, "exp")).toThrow(/MISSING_AGREEMENT_RECORD/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
