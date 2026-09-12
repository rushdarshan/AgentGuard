// The Lab verdict contract. The legacy FusedVerdict.passed boolean collapses
// outcome semantics: "the system failed" and "the evaluator could not
// determine whether the system failed" must never share a value. The Lab
// therefore defines EvaluationResult fresh; existing consumers (proxy, CLI,
// routers, reports) keep using FusedVerdict untouched.
//
// Three-part case-result model (locked):
//   completedEvaluation : EvaluationResult | null  (outcome PASS/FAIL/ABSTAIN/EVALUATOR_ERROR)
//   evidenceIntegrity   : COMPLETE | FAILED + findings[]
//   result              : the five-state reported value, DERIVED, never stored
//                         independently. A target FAIL with a broken evidence
//                         chain reports INFRASTRUCTURE_ERROR while the FAIL is
//                         preserved in completedEvaluation.

export type Outcome = "PASS" | "FAIL" | "ABSTAIN" | "EVALUATOR_ERROR";
export type CaseResult = Outcome | "INFRASTRUCTURE_ERROR";

export interface EvaluationResult {
  outcome: Outcome;
  reasonCode: string; // machine-readable, e.g. "ADAPTER_CONFLICT", "INSUFFICIENT_SURVIVORS"
  detail?: string;
  degraded?: boolean; // true when mapped from partial-but-sufficient consensus
}

export interface EvidenceIntegrityView {
  status: "COMPLETE" | "FAILED";
  findings: string[];
}

export function deriveResult(
  completedEvaluation: EvaluationResult | null,
  evidenceIntegrity: EvidenceIntegrityView,
): CaseResult {
  if (evidenceIntegrity.status === "FAILED") return "INFRASTRUCTURE_ERROR";
  if (completedEvaluation === null) return "INFRASTRUCTURE_ERROR"; // nothing to report on
  return completedEvaluation.outcome;
}
