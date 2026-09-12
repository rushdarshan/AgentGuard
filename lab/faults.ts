// The five minimal foundation faults. Each fault is injected at a dependency
// boundary and detected by running the ordinary production path — never by
// assigning the expected representation directly:
//   evaluator_failure -> the evaluator throws -> runEvaluatorSafely yields null
//                        -> completedEvaluation null, evidence COMPLETE
//   malformed_result  -> an invalid envelope through the real adapter ->
//                        EVALUATOR_ERROR with reason INVALID_ENVELOPE
//   missing_trace     -> the trace entry is removed, then the production
//                        checkEvidenceIntegrity discovers the absence ->
//                        evidence FAILED, evaluation preserved
//   replay_mismatch   -> observations are mutated, then the real replay()
//                        comparison detects the divergence -> REPLAY_MISMATCH
//                        finding, evaluation preserved
//   duplicate_result  -> a second record for an existing case identity is
//                        written outside Generate mode -> the production
//                        writeBundle rejects it naming both bundle ids; the
//                        duplicate judge labels are excluded from agreement
//                        with DUPLICATE_LABEL by computeAgreement
// CLI fault-demonstration records are real bundles under a dedicated
// experiment id, flagged in metadata and excluded from slice statistics.

import { adaptFusedVerdict } from "./adapter.js";
import { computeAgreement, type JudgeLabelRecord } from "./agreement.js";
import {
  bundlePath,
  checkEvidenceIntegrity,
  writeBundle,
  type CaseExecution,
  type JudgeLabelProvenance,
} from "./bundle.js";
import { CaseIdentity } from "./identity.js";
import { replay, type Rescorer } from "./replay.js";
import { deriveResult, runEvaluatorSafely, type EvaluationResult } from "./verdict.js";

export type FaultName = "evaluator_failure" | "malformed_result" | "missing_trace" | "replay_mismatch" | "duplicate_result";

export const FAULT_NAMES: FaultName[] = ["evaluator_failure", "malformed_result", "missing_trace", "replay_mismatch", "duplicate_result"];

export const FAULT_DEMO_EXPERIMENT_SUFFIX = "fault-demonstrations";

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

type FaultExecution = {
  execution: CaseExecution;
  accepted: boolean;
  reason: string;
} & CaseExecution;

function faultResult(execution: CaseExecution, accepted: boolean, reason: string): FaultExecution {
  return Object.assign({ execution, accepted, reason }, execution);
}

export interface FaultContext {
  rescorer?: Rescorer;
  resultsDir?: string;
  // How to perturb observations so the rescorer answers differently. Only the
  // experiment knows which change flips its verdict; the default marker suits
  // rescorers that echo observations. Without a verdict-changing mutation the
  // fault cannot take, and applyFault reports it as not detected.
  mutate?: (observations: unknown) => unknown;
}

// Inject a fault into a COPY of exec through the production path and return
// the resulting execution plus how the production detector judged it.
export function applyFault(
  exec: CaseExecution,
  fault: FaultName,
  ctx: FaultContext = {},
): { execution: CaseExecution; accepted: boolean; reason: string } {
  const copy = clone(exec);
  copy.faultDemonstration = fault;
  switch (fault) {
    case "evaluator_failure": {
      // Boundary: the evaluator raises before producing a verdict.
      const evaluation = runEvaluatorSafely((): EvaluationResult => {
        throw new Error("FAULT_EVALUATOR_FAILURE: injected evaluator crash");
      });
      copy.completedEvaluation = evaluation;
      copy.result = deriveResult(copy.completedEvaluation, copy.evidenceIntegrity);
      const ok = copy.completedEvaluation === null && copy.result === "EVALUATOR_ERROR";
      return faultResult(
        copy,
        ok,
        ok ? "evaluator_failure: no verdict produced, result EVALUATOR_ERROR" : "evaluator_failure NOT detected",
      );
    }
    case "malformed_result": {
      // Boundary: a structurally invalid envelope through the real adapter.
      const evaluation = adaptFusedVerdict({ outcome: "MAYBE", passed: "yes" });
      copy.completedEvaluation = evaluation;
      copy.result = deriveResult(copy.completedEvaluation, copy.evidenceIntegrity);
      const ok =
        copy.completedEvaluation?.outcome === "EVALUATOR_ERROR" &&
        copy.completedEvaluation?.reasonCode === "INVALID_ENVELOPE";
      return faultResult(
        copy,
        ok,
        ok ? "malformed_result: adapter rejected envelope as INVALID_ENVELOPE" : "malformed_result NOT detected",
      );
    }
    case "missing_trace": {
      // Boundary: the trace entry is removed; production validation discovers it.
      copy.traces = [];
      copy.evidenceIntegrity = checkEvidenceIntegrity(copy, ctx.resultsDir ?? "__absent__");
      copy.result = deriveResult(copy.completedEvaluation, copy.evidenceIntegrity);
      const preserved =
        JSON.stringify(copy.completedEvaluation) === JSON.stringify(exec.completedEvaluation);
      const ok =
        copy.evidenceIntegrity.status === "FAILED" &&
        copy.evidenceIntegrity.findings.some((f) => f.startsWith("MISSING_TRACE")) &&
        preserved &&
        copy.result === "INFRASTRUCTURE_ERROR";
      return faultResult(
        copy,
        ok,
        ok ? "missing_trace: discovered at assembly, evaluation preserved" : "missing_trace NOT detected",
      );
    }
    case "replay_mismatch": {
      // Boundary: observations are mutated, then the real replay comparison
      // must detect the divergence. Requires the experiment's rescorer.
      if (!ctx.rescorer) throw new Error("replay_mismatch requires ctx.rescorer");
      const rescorer: Rescorer = {
        rescore: (candidate) => {
          const result = ctx.rescorer!.rescore(candidate);
          return {
            ...result,
            outcome: result.outcome === "PASS" ? "FAIL" : "PASS",
            reasonCode: "FAULT_REPLAY_MISMATCH",
          };
        },
      };
      if (copy.observations !== null && typeof copy.observations === "object" && !Array.isArray(copy.observations)) {
        (copy.observations as Record<string, unknown>).__fault_replay_mismatch = true;
      } else {
        copy.observations = { __wrapped: copy.observations, __fault_replay_mismatch: true };
      }
      const outcome = replay(copy, rescorer, { mode: "ARTIFACT_REPLAY" });
      const ok = outcome.code === "REPLAY_MISMATCH";
      if (ok) {
        copy.evidenceIntegrity = { status: "FAILED", findings: ["REPLAY_MISMATCH: re-scored canonical projection differs"] };
      }
      copy.result = deriveResult(copy.completedEvaluation, copy.evidenceIntegrity);
      const preserved =
        JSON.stringify(copy.completedEvaluation) === JSON.stringify(exec.completedEvaluation);
      return faultResult(
        copy,
        ok && preserved && copy.result === "INFRASTRUCTURE_ERROR",
        ok ? "replay_mismatch: replay comparison detected divergence" : `replay_mismatch NOT detected (${outcome.code})`,
      );
    }
    case "duplicate_result": {
      // Representation: a second label for the same (case, judge). Detection
      // is production computeAgreement, which excludes the duplicate with
      // DUPLICATE_LABEL instead of scoring it twice.
      const first = copy.provenance[0];
      copy.provenance = [...copy.provenance, clone(first)];
      copy.result = deriveResult(copy.completedEvaluation, copy.evidenceIntegrity);
      const key = new CaseIdentity(copy.identity).key;
      const records: JudgeLabelRecord[] = copy.provenance.map((p) => ({
        caseKey: key,
        judgeId: p.judgeId,
        label: p.parsedLabel,
        brokenEvidence: false,
      }));
      let summary;
      try {
        summary = computeAgreement(records);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        return faultResult(
          copy,
          reason.startsWith("DUPLICATE_LABEL"),
          reason.startsWith("DUPLICATE_LABEL") ? reason : `duplicate_result NOT detected: ${reason}`,
        );
      }
      const excluded = summary.pairs.every((p) =>
        p.excluded.some((e) => e.caseKey === key && e.reason === "DUPLICATE_LABEL"),
      );
      return faultResult(
        copy,
        excluded,
        excluded ? "duplicate_result: second label excluded as DUPLICATE_LABEL" : "duplicate_result NOT detected",
      );
    }
  }
}

export interface FaultVerdict {
  accepted: boolean;
  reason: string;
}

// Intake validation for records presented for publication: duplicate judge
// labels on one case and unknown outcome values are rejected before they can
// enter the evidence chain.
export function detectFault(exec: CaseExecution): FaultVerdict {
  if (exec.provenance.some((p, i) => exec.provenance.findIndex((q) => q.judgeId === p.judgeId) !== i)) {
    return { accepted: false, reason: "duplicate_result: two labels for the same judge on one case" };
  }
  const outcome = exec.completedEvaluation?.outcome;
  if (
    outcome === "EVALUATOR_ERROR" &&
    exec.completedEvaluation?.reasonCode === "INVALID_ENVELOPE"
  ) {
    return { accepted: false, reason: "malformed_result: invalid evaluator envelope" };
  }
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
      return { result: "EVALUATOR_ERROR", evaluationPreserved: false };
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
  bundleId: string;
  file: string;
}

// CLI fault demonstration: inject each fault through the production path and
// write the outcome as a real bundle under a dedicated experiment id. Demo
// records carry faultDemonstration, live beside the slice (never inside its
// case set), and are excluded from the slice's agreement statistics by
// experiment id. Base is never mutated; nothing touches committed slice
// artifacts except the demo experiment's own directory.
export function demonstrateFaults(
  base: CaseExecution,
  resultsRoot: string,
  demoExperimentId: string = `${base.experimentId}-fault-demonstrations`,
  rescorer: Rescorer = {
    rescore: (exec) => exec.completedEvaluation ?? { outcome: "EVALUATOR_ERROR", reasonCode: "NO_EVALUATION" },
  },
  mutate?: (observations: unknown) => unknown,
): FaultDemonstration[] {
  return FAULT_NAMES.map((fault) => {
    const { execution, accepted, reason } = applyFault(base, fault, { rescorer, resultsDir: resultsRoot, mutate });
    // A distinct case identity per fault: five demo records, no collisions.
    const demoExec: CaseExecution = {
      ...execution,
      experimentId: demoExperimentId,
      identity: { ...execution.identity, sourceCaseId: `${execution.identity.sourceCaseId}__${fault}` },
    };
    const bundleId = writeBundle(resultsRoot, demoExec, "generate");
    return { fault, accepted, reason, bundleId, file: bundlePath(resultsRoot, demoExperimentId, demoExec.identity) };
  });
}

// Re-verify a committed fault-demonstration bundle by re-running the detector
// side. Used by the report renderer so the fault section describes re-checked
// evidence, not stored claims.
export function verifyFaultDemo(exec: CaseExecution): { accepted: boolean; reason: string } {
  const fault = exec.faultDemonstration as FaultName | undefined;
  if (!fault) return { accepted: false, reason: "not a fault-demonstration record" };
  switch (fault) {
    case "evaluator_failure": {
      const ok = exec.completedEvaluation === null && exec.result === "EVALUATOR_ERROR";
      return { accepted: ok, reason: "evaluator produced no verdict; result EVALUATOR_ERROR" };
    }
    case "malformed_result": {
      const ok =
        exec.completedEvaluation?.outcome === "EVALUATOR_ERROR" &&
        exec.completedEvaluation?.reasonCode === "INVALID_ENVELOPE";
      return { accepted: ok, reason: "adapter rejected the envelope as INVALID_ENVELOPE" };
    }
    case "missing_trace": {
      const ok =
        exec.evidenceIntegrity.status === "FAILED" &&
        exec.evidenceIntegrity.findings.some((f) => f.startsWith("MISSING_TRACE")) &&
        exec.result === "INFRASTRUCTURE_ERROR";
      return { accepted: ok, reason: "missing trace recorded as evidence FAILED, evaluation preserved" };
    }
    case "replay_mismatch": {
      const ok =
        exec.evidenceIntegrity.status === "FAILED" &&
        exec.evidenceIntegrity.findings.some((f) => f.startsWith("REPLAY_MISMATCH")) &&
        exec.result === "INFRASTRUCTURE_ERROR";
      return { accepted: ok, reason: "replay divergence recorded as evidence FAILED" };
    }
    case "duplicate_result": {
      const verdict = detectFault(exec);
      return { accepted: !verdict.accepted, reason: "duplicate judge labels rejected at intake" };
    }
  }
}

export type { JudgeLabelProvenance };
