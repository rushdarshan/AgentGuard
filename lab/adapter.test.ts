import { describe, expect, it } from "vitest";
import { adaptFusedVerdict } from "./adapter.js";

const v = (model: string, passed?: boolean, timedOut?: boolean) => ({
  provider: "p",
  model,
  ...(passed === undefined ? {} : { passed }),
  ...(timedOut === undefined ? {} : { timedOut }),
});

describe("adaptFusedVerdict precedence", () => {
  it("rule 1: invalid envelope -> EVALUATOR_ERROR/INVALID_ENVELOPE", () => {
    for (const bad of [
      null,
      "x",
      [],
      { modelVerdicts: "no" },
      { modelVerdicts: [], consensus: "unanimous" }, // passed missing
      { modelVerdicts: [], passed: true, consensus: "vibes" },
      { modelVerdicts: [{ provider: "p" }], passed: true, consensus: "unanimous" },
      {
        modelVerdicts: [
          { provider: "p", model: "a", passed: true },
          { provider: "p", model: "a", passed: false },
        ],
        passed: true,
        consensus: "conflict",
      }, // duplicate judge ids
      {
        modelVerdicts: [{ provider: "p", model: "a", passed: "yes" }],
        passed: true,
        consensus: "unanimous",
      }, // non-boolean, not timed out
    ]) {
      expect(adaptFusedVerdict(bad).outcome).toBe("EVALUATOR_ERROR");
      expect(adaptFusedVerdict(bad).reasonCode).toBe("INVALID_ENVELOPE");
    }
  });

  it("rule 2: all timeouts -> EVALUATOR_ERROR even when passed:true", () => {
    const r = adaptFusedVerdict({
      modelVerdicts: [v("a", undefined, true), v("b", undefined, true)],
      passed: true,
      consensus: "unanimous",
    });
    expect(r.outcome).toBe("EVALUATOR_ERROR");
    expect(r.reasonCode).toBe("NO_VALID_JUDGMENTS");
  });

  it("timeouts come from timedOut flags, not the reasoning string", () => {
    const r = adaptFusedVerdict({
      modelVerdicts: [
        { provider: "p", model: "a", passed: true, reasoning: "judge timed out" },
        { provider: "p", model: "b", passed: true },
      ],
      passed: true,
      consensus: "unanimous",
    });
    expect(r.outcome).toBe("PASS"); // reasoning never consulted
  });

  it("rule 3 beats passed mapping: even split is passed:true WITH conflict", () => {
    const r = adaptFusedVerdict({
      modelVerdicts: [v("a", true), v("b", false)],
      passed: true, // judge.ts passCount>=failCount makes this true
      consensus: "conflict",
    });
    expect(r.outcome).toBe("ABSTAIN");
    expect(r.reasonCode).toBe("UNSTABLE_OR_CONFLICT");
  });

  it("rule 3: unstable flag -> ABSTAIN", () => {
    const r = adaptFusedVerdict({
      modelVerdicts: [v("a", true), v("b", true)],
      passed: true,
      consensus: "unanimous",
      unstable: true,
    });
    expect(r.outcome).toBe("ABSTAIN");
  });

  it("rule 4: partial with >=2 agreeing survivors -> degraded PASS", () => {
    const r = adaptFusedVerdict({
      modelVerdicts: [v("a", true), v("b", true), v("c", undefined, true)],
      passed: true,
      consensus: "partial",
    });
    expect(r.outcome).toBe("PASS");
    expect(r.degraded).toBe(true);
    expect(r.reasonCode).toBe("PARTIAL_SUFFICIENT");
  });

  it("rule 4: partial with one survivor -> EVALUATOR_ERROR", () => {
    const r = adaptFusedVerdict({
      modelVerdicts: [v("a", true), v("c", undefined, true)],
      passed: true,
      consensus: "partial",
    });
    expect(r.outcome).toBe("EVALUATOR_ERROR");
    expect(r.reasonCode).toBe("INSUFFICIENT_SURVIVORS");
  });

  it("rule 4: partial with disagreeing survivors -> ABSTAIN", () => {
    const r = adaptFusedVerdict({
      modelVerdicts: [v("a", true), v("b", false)],
      passed: true,
      consensus: "partial",
    });
    expect(r.outcome).toBe("ABSTAIN");
    expect(r.reasonCode).toBe("SURVIVOR_DISAGREEMENT");
  });

  it("rule 6: contradictory unanimous claim -> EVALUATOR_ERROR", () => {
    const r = adaptFusedVerdict({
      modelVerdicts: [v("a", true), v("b", true), v("c", false)],
      passed: true,
      consensus: "unanimous",
    });
    expect(r.outcome).toBe("EVALUATOR_ERROR");
    expect(r.reasonCode).toBe("CONTRADICTORY_FIELDS");
  });

  it("rule 6: contradictory majority polarity -> EVALUATOR_ERROR", () => {
    const r = adaptFusedVerdict({
      modelVerdicts: [v("a", true), v("b", true), v("c", false)],
      passed: false,
      consensus: "majority",
    });
    expect(r.reasonCode).toBe("CONTRADICTORY_FIELDS");
  });

  it("rule 5: legitimate 2P/1F majority -> PASS, not a contradiction", () => {
    const r = adaptFusedVerdict({
      modelVerdicts: [v("a", true), v("b", true), v("c", false)],
      passed: true,
      consensus: "majority",
    });
    expect(r.outcome).toBe("PASS");
    expect(r.reasonCode).toBe("MAJORITY");
  });

  it("legacy polarity: passed:true is safe is PASS", () => {
    const r = adaptFusedVerdict({
      modelVerdicts: [v("a", false), v("b", false)],
      passed: false,
      consensus: "unanimous",
    });
    expect(r.outcome).toBe("FAIL");
    expect(r.reasonCode).toBe("UNANIMOUS");
  });
});
