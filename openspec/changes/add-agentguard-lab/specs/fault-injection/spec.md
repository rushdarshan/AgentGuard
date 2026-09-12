# Spec Delta: fault-injection

## ADDED Requirements

### Requirement: Five minimal deterministic faults
The Lab SHALL define exactly five injected faults, each deterministic and in-process, each with a specified representation in the three-part result structure: evaluator failure (evaluator raises before producing a verdict → `completedEvaluation: null`, `result: EVALUATOR_ERROR`), malformed result (evaluator emits a structurally invalid envelope → `result: EVALUATOR_ERROR` with reason `INVALID_ENVELOPE`), missing trace (required trace absent at assembly → `evidenceIntegrity.status: FAILED` with the finding, `completedEvaluation` preserved, `result: INFRASTRUCTURE_ERROR`), replay mismatch (re-scored canonical projection diverges from the recorded one → `REPLAY_MISMATCH` finding, `result: INFRASTRUCTURE_ERROR`), and duplicate result (two conflicting records for one case identity outside Generate mode → rejected at write time with a conflict naming both records). Larger distributed fault injection is out of scope.

#### Scenario: Evaluator failure distinct from target failure
- **WHEN** the evaluator-fault injection fires on a case whose target behavior would have produced FAIL
- **THEN** the recorded result is `EVALUATOR_ERROR`, never `FAIL`, and no `completedEvaluation` verdict is fabricated

#### Scenario: Missing trace preserves the evaluation
- **WHEN** the missing-trace fault fires on a case whose evaluation completed with outcome FAIL
- **THEN** `completedEvaluation.outcome` stays FAIL, `evidenceIntegrity` records the finding, and `result` is `INFRASTRUCTURE_ERROR`

#### Scenario: Duplicate write rejected
- **WHEN** a Replay or Verify path attempts to write a second, conflicting record for an existing case identity
- **THEN** the write is rejected with a conflict naming both records, and the canonical artifact is unchanged

### Requirement: Faults proven by tests in temporary directories
Each of the five faults SHALL be proven by a vitest test that injects the fault against a copy of the slice's inputs in a temporary directory and asserts the recorded representation. Fault tests MUST NOT write to committed artifacts under `results/lab/`.

#### Scenario: Fault test leaves committed tree clean
- **WHEN** the fault-injection suite runs
- **THEN** `git status` shows no changes under `results/lab/`

### Requirement: CLI writes designated canonical fault-demonstration records
The Lab CLI SHALL provide a fault-demonstration mode that writes the five fault outcomes into bundles explicitly designated as fault demonstrations (flagged in metadata, stored under a dedicated experiment id) — these are the canonical, committed evidence that the semantics are distinguishable, and they are excluded from the real slice's agreement statistics.

#### Scenario: Demonstration records excluded from statistics
- **WHEN** dataset agreement is computed for the real slice
- **THEN** bundles flagged as fault demonstrations are not part of the case set
