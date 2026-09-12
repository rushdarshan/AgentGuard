import { describe, expect, it } from "vitest";
import { deriveResult, type EvaluationResult } from "./verdict.js";

const PASS: EvaluationResult = { outcome: "PASS", reasonCode: "UNANIMOUS" };
const FAIL: EvaluationResult = { outcome: "FAIL", reasonCode: "UNANIMOUS" };
const COMPLETE = { status: "COMPLETE", findings: [] } as const;
const BROKEN = { status: "FAILED", findings: ["MISSING_TRACE: t"]} as const;

describe("deriveResult", () => {
  it("integrity failure yields INFRASTRUCTURE_ERROR without touching the verdict", () => {
    expect(deriveResult(FAIL, BROKEN)).toBe("INFRASTRUCTURE_ERROR");
    expect(deriveResult(PASS, BROKEN)).toBe("INFRASTRUCTURE_ERROR");
    // the FAIL itself is preserved by reference in completedEvaluation
    const preserved: EvaluationResult | null = FAIL;
    expect(preserved.outcome).toBe("FAIL");
  });

  it("null evaluation with intact evidence is evaluator error, not infrastructure error", () => {
    expect(deriveResult(null, COMPLETE)).toBe("EVALUATOR_ERROR");
    expect(deriveResult(null, BROKEN)).toBe("INFRASTRUCTURE_ERROR");
  });

  it("complete evidence passes the outcome through", () => {
    expect(deriveResult(PASS, COMPLETE)).toBe("PASS");
    expect(deriveResult(FAIL, COMPLETE)).toBe("FAIL");
    expect(deriveResult({ outcome: "ABSTAIN", reasonCode: "UNSTABLE" }, COMPLETE)).toBe("ABSTAIN");
    expect(
      deriveResult({ outcome: "EVALUATOR_ERROR", reasonCode: "INSUFFICIENT_SURVIVORS" }, COMPLETE),
    ).toBe("EVALUATOR_ERROR");
  });
});
