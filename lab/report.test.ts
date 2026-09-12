import { describe, expect, it } from "vitest";
import { renderReport, agreementFromExecutions } from "./report.js";
import { makeExec } from "./test-helpers.js";
import type { CaseExecution } from "./bundle.js";

function exec(over: Partial<CaseExecution> = {}): CaseExecution {
  return makeExec({ experimentId: "exp-slice", ...over });
}

function input() {
  const executions = [
    exec({ identity: { sourceCaseId: "s1", arm: "protected", seed: 1, scenario: "fam" } }),
    exec({
      identity: { sourceCaseId: "s2", arm: "vulnerable", seed: 2, scenario: "fam" },
      completedEvaluation: { outcome: "FAIL", reasonCode: "UNANIMOUS" },
      result: "FAIL",
    }),
  ];
  const demos = [
    exec({
      identity: { sourceCaseId: "s1__evaluator_failure", arm: "protected", seed: 1, scenario: "fam" },
      experimentId: "exp-demos",
      completedEvaluation: null,
      result: "EVALUATOR_ERROR",
      faultDemonstration: "evaluator_failure",
    }),
  ];
  return { executions, demos, replay: { verified: 2, failures: [] as string[] } };
}

describe("renderReport", () => {
  it("renders null numerics as NA with the reason named, never a dash", () => {
    // Two cases is below the five-pair policy: every pair is NA.
    const summary = agreementFromExecutions(input().executions);
    expect(summary.pairs[0].status).toBe("INSUFFICIENT_PAIRED_CASES");
    const report = renderReport(input());
    expect(report).toContain("NA");
    expect(report).toContain("INSUFFICIENT_PAIRED_CASES");
    expect(report).not.toContain("—");
  });

  it("states the heuristic-vs-heuristic scope and the machinery-only boundary", () => {
    const report = renderReport(input());
    expect(report).toContain("heuristic-vs-heuristic");
    expect(report).toContain("no calibrated-abstention results");
    expect(report).toContain("no claim about real-world attack-prevention");
  });

  it("names the interaction-replay deferral and the parent-SHA caveat", () => {
    const report = renderReport(input());
    expect(report).toContain("INTERACTION_REPLAY is deferred");
    expect(report).toContain("UNSUPPORTED_REPLAY_MODE");
    expect(report).toContain("a commit cannot contain its own SHA");
  });

  it("summarises fault demonstrations from re-checked bundles", () => {
    const report = renderReport(input());
    expect(report).toContain("evaluator_failure");
    expect(report).toContain("excluded from the slice statistics");
  });

  it("says when no fault demonstrations are committed", () => {
    const report = renderReport({ executions: input().executions, demos: [], replay: { verified: 2, failures: [] } });
    expect(report).toContain("No fault-demonstration records committed");
  });

  it("makes no efficacy overclaims", () => {
    const report = renderReport(input());
    for (const banned of ["prevents attacks", "stops attacks", "blocks all", "proves"]) {
      expect(report).not.toContain(banned);
    }
  });
});
