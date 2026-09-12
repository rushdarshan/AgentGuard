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
  // Broken evidence dominates: nothing reported from an untrustworthy chain.
  if (evidenceIntegrity.status === "FAILED") return "INFRASTRUCTURE_ERROR";
  // No evaluation ran but the chain is intact: the evaluator failed, not the
  // target (fault-injection and evidence-bundle specs).
  if (completedEvaluation === null) return "EVALUATOR_ERROR";
  return completedEvaluation.outcome;
}

// Production evaluator boundary: an evaluator that raises produces no verdict.
// The caller records completedEvaluation null with evidence COMPLETE, which
// derives EVALUATOR_ERROR — never a fabricated verdict, never a target FAIL.
export function runEvaluatorSafely(evaluate: () => EvaluationResult): EvaluationResult | null {
  try {
    return evaluate();
  } catch {
    return null;
  }
}
