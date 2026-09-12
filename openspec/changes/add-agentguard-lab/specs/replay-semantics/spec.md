# Spec Delta: replay-semantics

## ADDED Requirements

### Requirement: Three replay modes declared; artifact required, interaction deferred
The verdict and bundle contracts SHALL carry a `replayMode` field with values `ARTIFACT_REPLAY`, `INTERACTION_REPLAY`, and `FRESH_EXECUTION` for all three modes. This change MUST implement `ARTIFACT_REPLAY` (re-score captured observations through the evaluator — no target or agent re-execution) and MUST NOT implement `INTERACTION_REPLAY` (re-drive the simulated agent from recorded inputs); a request for it SHALL fail with a clear `UNSUPPORTED_REPLAY_MODE` error naming it as deferred to a follow-on change. `FRESH_EXECUTION` SHALL remain the existing path, explicitly labelled non-deterministic.

#### Scenario: Artifact replay does not re-execute
- **WHEN** an artifact replay runs for a case
- **THEN** only the evaluator executes over captured observations and no agent trace is regenerated

#### Scenario: Interaction replay request fails clearly
- **WHEN** a caller requests `INTERACTION_REPLAY`
- **THEN** the Lab rejects the request with `UNSUPPORTED_REPLAY_MODE` and no partial replay occurs

### Requirement: Replay determinism is judged on a stable canonical projection
Byte-identical replay SHALL be defined against a canonical serialization of a stable projection of the verdict — outcome, reasonCode, stable evidence references, and deterministic decision metadata — excluding volatile fields (wall-clock timestamps, durations, attempt IDs, host paths). RFC 8785 (JCS) is the reference for canonical JSON ordering; the Lab MUST NOT claim RFC 8785 compliance without a conformance test against the spec's examples. The projection definition SHALL be versioned as part of the evaluator contract.

#### Scenario: Volatile fields excluded from comparison
- **WHEN** a replayed verdict differs from the recorded one only in timestamps or durations
- **THEN** the canonical projection is identical and the replay is deterministic

#### Scenario: Real divergence detected
- **WHEN** a replay produces a different outcome or reasonCode for identical inputs
- **THEN** the replay is flagged non-deterministic

### Requirement: Artifact integrity and verdict reproducibility are distinct checks
Replay SHALL run two separate checks with distinct codes. Artifact integrity: every recorded artifact's digest is verified against the bundle's manifest — a mismatch is `ARTIFACT_INTEGRITY_MISMATCH` regardless of whether the verdict would change. Verdict reproducibility: re-scoring intact artifacts must reproduce the canonical projection — a divergence is `REPLAY_MISMATCH`. Version and schema guards: an evaluator version differing from the recorded `evaluatorVersion` is `EVALUATOR_VERSION_MISMATCH` (the replay is a methodology change, not a determinism failure), and a bundle whose schema version the reader does not support is `UNSUPPORTED_SCHEMA_VERSION`. Integrity failures SHALL be recorded as findings under `evidenceIntegrity` with `result = INFRASTRUCTURE_ERROR` while `completedEvaluation` is preserved.

#### Scenario: Tampering that does not change the verdict is still rejected
- **WHEN** a recorded observation is edited in a way that the evaluator's verdict on it would be unchanged
- **THEN** the digest check still reports `ARTIFACT_INTEGRITY_MISMATCH` and the case's `evidenceIntegrity.status` is `FAILED`

#### Scenario: Honest limit on self-authentication
- **WHEN** an adversary edits an artifact and recomputes its digest inside the bundle
- **THEN** the bundle's internal check passes and the spec records that a self-contained checksum cannot authenticate data whose digest was changed alongside it — external anchoring (git commit of the bundle, or an external ledger) is the trust root

#### Scenario: Version mismatch is not a replay mismatch
- **WHEN** a replay runs with a newer evaluator version
- **THEN** the result is `EVALUATOR_VERSION_MISMATCH`, never `REPLAY_MISMATCH`

### Requirement: Replay mode and determinism claim are separate fields
Bundles SHALL carry `replayMode` (what was executed) and `determinismClaim` (what reproducibility is asserted: `BYTE_IDENTICAL_PROJECTION` / `STATISTICAL` for fresh execution / `NONE`) as distinct fields, so a fresh execution is never mislabelled as deterministic and an artifact replay never overclaims beyond the projection definition.

#### Scenario: Fresh execution labelled non-deterministic
- **WHEN** a case runs with live target execution
- **THEN** its bundle records `replayMode: FRESH_EXECUTION` with `determinismClaim: STATISTICAL` or `NONE`, never `BYTE_IDENTICAL_PROJECTION`
