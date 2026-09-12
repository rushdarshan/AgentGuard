# Spec Delta: evidence-bundle

## ADDED Requirements

### Requirement: CaseExecution carries a three-part result structure
Every `CaseExecution` SHALL carry three distinct parts: `completedEvaluation` (`EvaluationResult` with outcome ∈ PASS/FAIL/ABSTAIN/EVALUATOR_ERROR, or `null` when the evaluation did not complete), `evidenceIntegrity` (`status` ∈ COMPLETE/FAILED plus a `findings[]` array of integrity findings), and `result` (the reported outcome ∈ PASS/FAIL/ABSTAIN/EVALUATOR_ERROR/INFRASTRUCTURE_ERROR — the five locked states, derived from the other two parts, never stored independently of them). The three parts SHALL be separate fields so an integrity failure can never overwrite the evaluation outcome: a case with `completedEvaluation.outcome = FAIL` and `evidenceIntegrity.status = FAILED` SHALL exist and SHALL report `result = INFRASTRUCTURE_ERROR` while the FAIL remains visible.

#### Scenario: Failed target with broken evidence chain
- **WHEN** a case's evaluation completed with outcome `FAIL` and bundle assembly later discovers a missing required trace
- **THEN** the bundle preserves `completedEvaluation.outcome = FAIL`, records `evidenceIntegrity.status = FAILED` with the finding, and reports `result = INFRASTRUCTURE_ERROR`

#### Scenario: Incomplete evaluation with intact evidence
- **WHEN** a case's evaluation never completed (evaluator crashed before producing a verdict) and all captured artifacts exist
- **THEN** `completedEvaluation` is `null`, `evidenceIntegrity.status = COMPLETE`, and `result = EVALUATOR_ERROR`

### Requirement: Bundle schema with full traceability chain
Each `EvidenceBundle` SHALL contain: `bundleId`, `experimentId`, case identity (`sourceCaseId` + `arm` + `seed` + `scenario`), `targetVersion`, `datasetVersion`, `evaluatorVersion`, `input`, `observations`, `traces`, `assertions`, `completedEvaluation`, `evidenceIntegrity`, `result`, `agreement` (dataset-level, referenced), `replayMode`, `determinismClaim`, `environment`, and timestamps/metadata. The chain release-decision → `result` → assertions → raw observations → trace/artifacts → exact inputs + versions MUST be traversable by a reviewer from the bundle alone. `attemptId` (run-attempt identifier) SHALL be separate from case identity.

#### Scenario: Decision traceable to inputs
- **WHEN** a reviewer opens any bundle from a released experiment
- **THEN** they can follow the recorded decision to the verdict, the assertions behind it, the raw observations, the trace/artifact references, and the exact input + version hashes without consulting anything outside the bundle

#### Scenario: Case identity distinguishes arms and seeds
- **WHEN** the same source case runs in the protected and vulnerable arms with different seeds
- **THEN** the resulting bundles carry distinct case identities and neither overwrites the other

### Requirement: Content-addressed versions with declared input manifest
`datasetVersion`, `evaluatorVersion`, and `targetVersion` SHALL be content hashes. The evaluator hash SHALL cover the full declared evaluator input set — implementation files, fixtures, configuration, and prompts — computed as a sorted path+digest manifest (deterministic ordering over relative paths and file digests). The Lab MUST NOT use ad-hoc source-text transformations (such as comment stripping) as a hash. `targetVersion` SHALL be the parent git SHA with the known caveat that a commit cannot contain its own SHA (project convention #142) recorded in the bundle metadata.

#### Scenario: Config-only change bumps the evaluator version
- **WHEN** a judge's prompt or configuration changes with no change to implementation code
- **THEN** the evaluator content hash changes because the declared input set includes it

#### Scenario: Deterministic manifest ordering
- **WHEN** the same evaluator tree is hashed twice, or its files are enumerated in a different order
- **THEN** the sorted path+digest manifest produces the identical hash

### Requirement: Filesystem storage with regeneration drift protection
Bundles SHALL be written to `AgentGuard/results/lab/<experimentId>/` as one JSON file per case plus a JSONL index, committed to the repository. A vitest regeneration test (analogous to `m0-table.test.ts`) SHALL regenerate the committed human-readable report from the bundles and fail on drift. The report, not the SHA-bearing source artifacts, is the stable human-facing artifact (project convention #139/#140).

#### Scenario: Drift detected
- **WHEN** a committed report no longer matches what the bundles regenerate to
- **THEN** the drift test fails

### Requirement: Fixture provenance is a release requirement
Every judge label and every case fixture inside a bundle SHALL carry provenance: origin (`LIVE_CAPTURE` / `SYNTHETIC` / `HEURISTIC`), `judgeId`, model id, config hash, input hash, the raw response, and the parsed label. A bundle whose provenance fields are empty or fabricated MUST NOT be released.

#### Scenario: Heuristic labels marked as such
- **WHEN** the keyless slice records labels from `evaluateHeuristic`
- **THEN** each carries `origin: HEURISTIC` with the heuristic's judgeId and config hash, and the report states that agreement is heuristic-vs-heuristic

#### Scenario: Missing provenance blocks release
- **WHEN** a bundle's label lacks an origin or raw response
- **THEN** the release validation rejects the bundle

### Requirement: Command modes are distinct operations
The Lab SHALL define three command modes — Generate (write or replace the canonical artifacts for a case identity), Verify (recompute and compare without writing), and Replay (re-score captured observations under a named replay mode) — and MUST NOT rely on an implicit "first bundle wins" rule. Replacement under Generate SHALL be explicit.

#### Scenario: Regeneration is Generate, not a duplicate conflict
- **WHEN** an experiment is regenerated after an intentional methodology change
- **THEN** Generate replaces the artifacts for each case identity and the drift test is re-baselined deliberately, while a Replay never writes canonical artifacts
