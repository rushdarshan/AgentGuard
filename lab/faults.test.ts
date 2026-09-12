import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applyFault, demonstrateFaults, detectFault, expectedSemantics, FAULT_NAMES, type FaultName } from "./faults.js";
import { sha256, type CaseExecution } from "./bundle.js";
import type { EvaluationResult } from "./verdict.js";

const PASS: EvaluationResult = { outcome: "PASS", reasonCode: "UNANIMOUS" };

function makeExec(): CaseExecution {
  return {
    schemaVersion: 1,
    bundleId: "",
    experimentId: "exp",
    identity: { sourceCaseId: "s1", arm: "protected", seed: 7, scenario: "fam" },
    completedEvaluation: PASS,
    evidenceIntegrity: { status: "COMPLETE", findings: [] },
    result: "PASS",
    replayMode: "ARTIFACT_REPLAY",
    determinismClaim: "REPRODUCIBLE",
    provenance: [
      {
        judgeId: "h-1",
        origin: "HEURISTIC",
        modelId: null,
        configHash: null,
        inputHash: sha256("in"),
        rawResponse: null,
        parsedLabel: "PASS",
      },
    ],
    input: {},
    observations: {},
    traces: [{ path: "trace.json", digest: sha256("payload") }],
    assertions: [],
    environment: { nodeVersion: "v22", platform: "win32" },
    timestamps: { startedAt: "t0", finishedAt: "t1" },
    versions: { targetVersion: "sha", datasetVersion: "d", evaluatorVersion: "e" },
  };
}

describe("applyFault", () => {
  it("never mutates the input execution", () => {
    const exec = makeExec();
    const before = JSON.stringify(exec);
    applyFault(exec, "missing_trace");
    expect(JSON.stringify(exec)).toBe(before);
  });

  it("evaluator_failure: EVALUATOR_ERROR reported, evidence stays COMPLETE", () => {
    const f = applyFault(makeExec(), "evaluator_failure");
    expect(f.completedEvaluation?.outcome).toBe("EVALUATOR_ERROR");
    expect(f.evidenceIntegrity.status).toBe("COMPLETE");
    expect(f.result).toBe("EVALUATOR_ERROR");
    expect(f.faultDemonstration).toBe("evaluator_failure");
  });

  it("malformed_result: unknown outcome is rejected at detection", () => {
    const f = applyFault(makeExec(), "malformed_result");
    expect(detectFault(f).accepted).toBe(false);
  });

  it("missing_trace: verdict preserved, evidence FAILED, result INFRASTRUCTURE_ERROR", () => {
    const exec = makeExec();
    const f = applyFault(exec, "missing_trace");
    expect(f.completedEvaluation).toEqual(exec.completedEvaluation); // never rewritten
    expect(f.evidenceIntegrity.status).toBe("FAILED");
    expect(f.evidenceIntegrity.findings.some((s) => s.startsWith("MISSING_TRACE"))).toBe(true);
    expect(f.result).toBe("INFRASTRUCTURE_ERROR");
    expect(detectFault(f).accepted).toBe(true); // a recorded state, not an intake rejection
  });

  it("replay_mismatch: evidence FAILED with REPLAY_MISMATCH, verdict untouched", () => {
    const exec = makeExec();
    const f = applyFault(exec, "replay_mismatch");
    expect(f.completedEvaluation).toEqual(exec.completedEvaluation);
    expect(f.evidenceIntegrity.findings.some((s) => s.startsWith("REPLAY_MISMATCH"))).toBe(true);
    expect(f.result).toBe("INFRASTRUCTURE_ERROR");
  });

  it("duplicate_result: rejected at intake", () => {
    const f = applyFault(makeExec(), "duplicate_result");
    expect(f.provenance).toHaveLength(2);
    expect(f.provenance[0].judgeId).toBe(f.provenance[1].judgeId);
    expect(detectFault(f).accepted).toBe(false);
  });
});

describe("fault policy", () => {
  it("all five faults are declared", () => {
    expect([...FAULT_NAMES].sort()).toEqual(
      ["evaluator_failure", "malformed_result", "missing_trace", "replay_mismatch", "duplicate_result"].sort(),
    );
    for (const name of FAULT_NAMES) expect(() => applyFault(makeExec(), name as FaultName)).not.toThrow();
  });

  it("expectedSemantics matches what applyFault actually produces", () => {
    for (const name of FAULT_NAMES) {
      const expected = expectedSemantics(name);
      const f = applyFault(makeExec(), name);
      if (expected.result === "REJECTED_AT_INTAKE") {
        expect(detectFault(f).accepted).toBe(false);
      } else {
        expect(f.result).toBe(expected.result);
        if (expected.evaluationPreserved) {
          expect(f.completedEvaluation).toEqual(makeExec().completedEvaluation);
        }
      }
    }
  });
});

describe("demonstrateFaults", () => {
  it("writes one flagged canonical record per fault to a temp dir without mutating base", () => {
    const base = makeExec();
    const before = JSON.stringify(base);
    const dir = mkdtempSync(join(tmpdir(), "lab-faults-"));
    try {
      const demos = demonstrateFaults(base, dir);
      expect(JSON.stringify(base)).toBe(before);
      expect(demos.map((d) => d.fault).sort()).toEqual([...FAULT_NAMES].sort());
      for (const d of demos) {
        const record = JSON.parse(readFileSync(d.file, "utf8"));
        expect(record.faultDemonstration).toBe(d.fault);
        expect(record.accepted).toBe(d.accepted);
        expect(record.execution.faultDemonstration).toBe(d.fault);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
