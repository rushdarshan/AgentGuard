// The five minimal foundation faults, injected in-process on a COPY of the
// execution (never on committed artifacts; tests write to temp dirs). Each
// fault has exact outcome semantics:
//   evaluator_failure    -> completedEvaluation EVALUATOR_ERROR, evidence COMPLETE
//   malformed_result     -> adapter rejects the envelope -> EVALUATOR_ERROR
//   missing_trace        -> evidence FAILED, evaluation preserved -> INFRASTRUCTURE_ERROR
//   replay_mismatch      -> re-score disagrees with recorded verdict -> evidence
//                           FAILED (REPLAY_MISMATCH finding), evaluation preserved
//   duplicate_result     -> a second label for the same (case, judge) is rejected
// CLI fault-demonstration records carry faultDemonstration=<name> and are
// excluded from statistics.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { CaseExecution, JudgeLabelProvenance } from "./bundle.js";
import { deriveResult, type EvaluationResult } from "./verdict.js";

export type FaultName = "evaluator_failure" | "malformed_result" | "missing_trace" | "replay_mismatch" | "duplicate_result";

export const FAULT_NAMES: FaultName[] = ["evaluator_failure", "malformed_result", "missing_trace", "replay_mismatch", "duplicate_result"];

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export function applyFault(exec: CaseExecution, fault: FaultName): CaseExecution {
  const copy = clone(exec);
  copy.faultDemonstration = fault;
  switch (fault) {
    case "evaluator_failure": {
      const err: EvaluationResult = { outcome: "EVALUATOR_ERROR", reasonCode: "FAULT_EVALUATOR_FAILURE", detail: "injected evaluator failure" };
      copy.completedEvaluation = err;
      break;
    }
    case "malformed_result": {
      // An envelope the adapter must refuse: unknown outcome value.
      copy.completedEvaluation = { outcome: "MAYBE", reasonCode: "FAULT_MALFORMED" } as unknown as EvaluationResult;
      break;
    }
    case "missing_trace": {
      copy.evidenceIntegrity = { status: "FAILED", findings: ["MISSING_TRACE: required trace artifact absent"] };
      break;
    }
    case "replay_mismatch": {
      copy.evidenceIntegrity = { status: "FAILED", findings: ["REPLAY_MISMATCH: re-scored canonical projection differs"] };
      break;
    }
    case "duplicate_result": {
      const first = copy.provenance[0];
      copy.provenance = [...copy.provenance, clone(first)]; // same (case, judge) twice
      break;
    }
  }
  copy.result = deriveResult(copy.completedEvaluation, copy.evidenceIntegrity);
  return copy;
}

export interface FaultVerdict {
  accepted: boolean;
  reason: string;
}

// The detector side: what the pipeline does when it MEETS each fault state.
export function detectFault(exec: CaseExecution): FaultVerdict {
  if (exec.provenance.some((p, i) => exec.provenance.findIndex((q) => q.judgeId === p.judgeId) !== i)) {
    return { accepted: false, reason: "duplicate_result: two labels for the same judge on one case" };
  }
  const outcome = exec.completedEvaluation?.outcome;
  if (outcome !== undefined && outcome !== null && !["PASS", "FAIL", "ABSTAIN", "EVALUATOR_ERROR"].includes(outcome)) {
    return { accepted: false, reason: `malformed_result: unknown outcome ${String(outcome)}` };
  }
  if (exec.evidenceIntegrity.status === "FAILED" && exec.evidenceIntegrity.findings.some((f) => f.startsWith("MISSING_TRACE"))) {
    return { accepted: true, reason: "missing_trace: recorded as evidence FAILED, evaluation preserved" };
  }
  return { accepted: true, reason: "ok" };
}

export function expectedSemantics(fault: FaultName): { result: string; evaluationPreserved: boolean } {
  switch (fault) {
    case "evaluator_failure":
      return { result: "EVALUATOR_ERROR", evaluationPreserved: false };
    case "malformed_result":
      return { result: "REJECTED_AT_INTAKE", evaluationPreserved: false };
    case "missing_trace":
      return { result: "INFRASTRUCTURE_ERROR", evaluationPreserved: true };
    case "replay_mismatch":
      return { result: "INFRASTRUCTURE_ERROR", evaluationPreserved: true };
      case "duplicate_result":
        return { result: "REJECTED_AT_INTAKE", evaluationPreserved: false };
    }
}

export interface FaultDemonstration {
  fault: FaultName;
  accepted: boolean;
  reason: string;
  file: string;
}

// CLI fault demonstration: apply each fault to a copy of `base`, run the
// intake check, and write one canonical record per fault under faultsRoot.
// Records carry faultDemonstration and are excluded from statistics; base is
// never mutated and nothing here touches committed experiment artifacts.
export function demonstrateFaults(base: CaseExecution, faultsRoot: string): FaultDemonstration[] {
  mkdirSync(faultsRoot, { recursive: true });
  return FAULT_NAMES.map((fault) => {
    const execution = applyFault(base, fault);
    const verdict = detectFault(execution);
    const file = join(faultsRoot, `${fault}.json`);
    writeFileSync(
      file,
      JSON.stringify({ faultDemonstration: fault, expected: expectedSemantics(fault), ...verdict, execution }, null, 2) + "\n",
    );
    return { fault, ...verdict, file };
  });
}

export type { JudgeLabelProvenance };
