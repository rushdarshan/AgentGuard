import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  applyFault,
  demonstrateFaults,
  detectFault,
  expectedSemantics,
  FAULT_NAMES,
  verifyFaultDemo,
  type FaultName,
} from "./faults.js";
import { listExperimentBundles, sha256, type CaseExecution } from "./bundle.js";
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
    agreementRef: null,
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
    observations: { verdict: "PASS" },
    traces: [{ path: "trace.json", digest: sha256("payload") }],
    assertions: [],
    environment: { nodeVersion: "v22", platform: "win32" },
    timestamps: { startedAt: "t0", finishedAt: "t1" },
    versions: { targetVersion: "sha", datasetVersion: "d", evaluatorVersion: "e" },
  };
}

// A rescorer that genuinely depends on observations: flipping the verdict
// field flips the outcome, so a mutated observation is really detected.
const flipping = { rescore: (exec: CaseExecution) => exec.observations as EvaluationResult };

describe("applyFault injects through the production path", () => {
  it("never mutates the input execution", () => {
    const exec = makeExec();
    const before = JSON.stringify(exec);
    applyFault(exec, "missing_trace");
    applyFault(exec, "replay_mismatch", { rescorer: flipping });
    expect(JSON.stringify(exec)).toBe(before);
  });

  it("evaluator_failure: throwing evaluator yields null, result EVALUATOR_ERROR", () => {
    const { execution: f, accepted } = applyFault(makeExec(), "evaluator_failure");
    expect(accepted).toBe(true);
    expect(f.completedEvaluation).toBeNull(); // no verdict fabricated
    expect(f.evidenceIntegrity.status).toBe("COMPLETE");
    expect(f.result).toBe("EVALUATOR_ERROR");
    expect(f.faultDemonstration).toBe("evaluator_failure");
  });

  it("malformed_result: real adapter rejects the envelope as INVALID_ENVELOPE", () => {
    const { execution: f, accepted } = applyFault(makeExec(), "malformed_result");
    expect(accepted).toBe(true);
    expect(f.completedEvaluation?.outcome).toBe("EVALUATOR_ERROR");
    expect(f.completedEvaluation?.reasonCode).toBe("INVALID_ENVELOPE");
    expect(f.result).toBe("EVALUATOR_ERROR");
  });

  it("missing_trace: production validation discovers the removed trace", () => {
    const exec = makeExec();
    const { execution: f, accepted } = applyFault(exec, "missing_trace");
    expect(accepted).toBe(true);
    expect(f.completedEvaluation).toEqual(exec.completedEvaluation); // never rewritten
    expect(f.evidenceIntegrity.status).toBe("FAILED");
    expect(f.evidenceIntegrity.findings.some((s) => s.startsWith("MISSING_TRACE"))).toBe(true);
    expect(f.result).toBe("INFRASTRUCTURE_ERROR");
    expect(detectFault(f).accepted).toBe(true); // a recorded state, not an intake rejection
  });

  it("replay_mismatch: real replay comparison detects mutated observations", () => {
    const exec = makeExec();
    const { execution: f, accepted } = applyFault(exec, "replay_mismatch", { rescorer: flipping });
    // observations carry the fault marker; the rescorer echoes them back as
    // the verdict, so the canonical projection really diverges.
    expect(accepted).toBe(true);
    expect(f.completedEvaluation).toEqual(exec.completedEvaluation);
    expect(f.evidenceIntegrity.findings.some((s) => s.startsWith("REPLAY_MISMATCH"))).toBe(true);
    expect(f.result).toBe("INFRASTRUCTURE_ERROR");
  });

  it("replay_mismatch without a rescorer refuses instead of assigning", () => {
    expect(() => applyFault(makeExec(), "replay_mismatch")).toThrow(/requires ctx.rescorer/);
  });

  it("duplicate_result: second label excluded by production agreement", () => {
    const { execution: f, accepted } = applyFault(makeExec(), "duplicate_result");
    expect(accepted).toBe(true);
    expect(f.provenance).toHaveLength(2);
    expect(f.provenance[0].judgeId).toBe(f.provenance[1].judgeId);
    expect(detectFault(f).accepted).toBe(false); // rejected at intake
  });
});

describe("fault policy", () => {
  it("all five faults are declared", () => {
    expect([...FAULT_NAMES].sort()).toEqual(
      ["evaluator_failure", "malformed_result", "missing_trace", "replay_mismatch", "duplicate_result"].sort(),
    );
    for (const name of FAULT_NAMES) {
      const ctx = name === "replay_mismatch" ? { rescorer: flipping } : {};
      expect(() => applyFault(makeExec(), name as FaultName, ctx)).not.toThrow();
    }
  });

  it("expectedSemantics matches what applyFault actually produces", () => {
    for (const name of FAULT_NAMES) {
      const expected = expectedSemantics(name);
      if (expected.result === "REJECTED_AT_INTAKE") {
        const { execution: f } = applyFault(makeExec(), name);
        expect(detectFault(f).accepted).toBe(false);
        continue;
      }
      const ctx = name === "replay_mismatch" ? { rescorer: flipping } : {};
      const { execution: f, accepted } = applyFault(makeExec(), name, ctx);
      expect(accepted).toBe(true);
      expect(f.result).toBe(expected.result);
      if (expected.evaluationPreserved) {
        expect(f.completedEvaluation).toEqual(makeExec().completedEvaluation);
      }
    }
  });
});

describe("demonstrateFaults", () => {
  it("writes one flagged real bundle per fault to a temp dir without mutating base", () => {
    const base = makeExec();
    const before = JSON.stringify(base);
    const dir = mkdtempSync(join(tmpdir(), "lab-faults-"));
    try {
      // The echoing rescorer reacts to the default marker mutation, so the
      // replay comparison genuinely detects the divergence.
      const demos = demonstrateFaults(base, dir, "exp-fault-demos", flipping);
      expect(JSON.stringify(base)).toBe(before);
      expect(demos.map((d) => d.fault).sort()).toEqual([...FAULT_NAMES].sort());
      // Every demo is a readable bundle flagged in metadata...
      const bundles = listExperimentBundles(dir, "exp-fault-demos");
      expect(bundles).toHaveLength(5);
      for (const d of demos) {
        const record = JSON.parse(readFileSync(d.file, "utf8"));
        expect(record.faultDemonstration).toBe(d.fault);
        expect(record.experimentId).toBe("exp-fault-demos");
      }
      // ...and every demo re-verifies through the detector side.
      for (const b of bundles) expect(verifyFaultDemo(b).accepted).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
