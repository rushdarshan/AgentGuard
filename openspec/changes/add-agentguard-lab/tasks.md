# Tasks: add-agentguard-lab foundation

Implementation root: `res/AgentGuard/` (planning lives in `res/openspec/` — do not create a second AgentGuard). Purely additive per the migration plan: no edits to `src/_core/`, `proxy.ts`, existing consumers, or `benchmarks/m0/`.

## 1. Types and module scaffold (D1, D8)

- [x] 1.1 Create `lab/` top-level module (`lab/verdict.ts`, `lab/adapter.ts`, `lab/agreement.ts`, `lab/bundle.ts`, `lab/replay.ts`, `lab/faults.ts`, `lab/experiments/`, `lab/run.ts`) so `npx tsx lab/run.ts` resolves
- [x] 1.2 In `lab/verdict.ts` define the three-part contract: `EvaluationOutcome` (PASS/FAIL/ABSTAIN/EVALUATOR_ERROR), `EvidenceStatus` (COMPLETE/FAILED) + `findings[]`, `ReportedResult` (five states), `EvaluationResult`, `CaseExecution` carrying `completedEvaluation | null` + `evidenceIntegrity` + derived-only `result` (exported `deriveResult()` is the only producer)
- [x] 1.3 Typecheck gate: `npx tsc --noEmit` shows zero new errors under `lab/` (pre-existing `src/` baseline errors are not regressions, per M0 convention #121)

## 2. Adapter: FusedVerdict → EvaluationResult (D2)

- [x] 2.1 Implement `lab/adapter.ts` as the ordered precedence table from the evaluation-verdict spec (1 invalid envelope → 2 no/insufficient valid survivors → 3 unstable/conflict → 4 partial with ≥2 agreeing survivors (degraded) → 5 complete valid → 6 contradictory), first match wins; document legacy polarity (`passed:true` = safe = PASS) in a code comment citing `judge.ts`
- [x] 2.2 Detect timeouts only from `modelVerdicts[].timedOut` flags; invalidate duplicate judge ids; never read the `reasoning` string or `FusedVerdict.kappa`
- [x] 2.3 Write `lab/adapter.test.ts` asserting every rule fires and overlap cases resolve per order: even-split `passed:true` + `consensus:"conflict"` → ABSTAIN; all-timeout → EVALUATOR_ERROR/NO_VALID_JUDGMENTS; partial with 1 survivor → INSUFFICIENT_SURVIVORS; partial with ≥2 agreeing → PASS/FAIL `degraded:true`; contradictory → CONTRADICTORY_FIELDS; null/undefined input → INVALID_ENVELOPE guard

## 3. Agreement analysis (D3)

- [x] 3.1 Implement `lab/agreement.ts`: per-pair Cohen's κ from individual judge labels (never fused outcomes), `meanPairwiseKappa` = unweighted mean of available pairwise κ with included/excluded pair counts, per-pair contingency excluding ABSTAIN/missing labels, EVALUATOR_ERROR cases counted separately
- [x] 3.2 Implement policy gates with reason codes: `UNDEFINED_EXPECTED_AGREEMENT` (expected agreement = 1), `INSUFFICIENT_PAIRED_CASES` (<5 valid paired cases), `INSUFFICIENT_LABEL_VARIATION` (a judge lacks both label classes) → `NA`, never 0; label the aggregate `meanPairwiseKappa` in every output (never "Cohen's κ for all judges")
- [x] 3.3 Write `lab/agreement.test.ts`: known-label κ values, each NA reason triggered in isolation, fused-ABSTAIN case still contributes its valid judge pair, degenerate all-same-label pair → UNDEFINED_EXPECTED_AGREEMENT

## 4. Evidence bundle, canonicalization, versioning (D4, D5)

- [x] 4.1 Implement `lab/bundle.ts`: `EvidenceBundle` type with all spec fields — case identity `sourceCaseId+arm+seed+scenario` (separate `attemptId`), `replayMode` distinct from `determinismClaim`, `bundleSchemaVersion`, environment, input/observations/traces/assertions, three-part result, per-label provenance (`origin`, `judgeId`, model id, config/input hashes, raw response, parsed label), timestamps
- [x] 4.2 Implement `canonicalJson()` (RFC 8785 key-order/number rules) and `stableProjection()` (outcome, reasonCode, stable evidence refs, deterministic decision metadata; excludes timestamps, durations, attemptIds, host paths) as the single exported pair everything routes through; add a serialization conformance test before any "JCS-compliant" wording exists anywhere
- [x] 4.3 Implement content-hash versioning: sorted path+digest manifest over the full declared evaluator input set (no comment stripping) for `datasetVersion`/`evaluatorVersion`; `targetVersion` = parent git SHA with #142 caveat constant
- [x] 4.4 Implement Generate/Verify/Replay command modes (Generate writes `results/lab/<experimentId>/<caseId>.json` + `index.jsonl`; Verify recomputes and compares, writes nothing; Replay writes nothing); duplicate case identity on Generate → second rejected/recorded, first bundle wins
- [x] 4.5 Write `lab/bundle.test.ts`: key-order and volatile-field noise does not change `canonicalJson` output; projection excludes every volatile field; manifest hash changes when any declared input changes and is order-stable; mode write-permissions (Verify/Replay touch no files)

## 5. Replay and integrity (D5)

- [x] 5.1 Implement `lab/replay.ts` artifact replay: verify recorded digests against stored artifacts first (tamper → `ARTIFACT_INTEGRITY_MISMATCH` even when the verdict is unchanged), then re-score intact artifacts and compare `stableProjection` (mismatch → `REPLAY_MISMATCH`, recorded as `evidenceIntegrity: FAILED` with the recorded evaluation preserved)
- [x] 5.2 Implement version guards as integrity-side refusals with distinct codes: `EVALUATOR_VERSION_MISMATCH` (input-set hash differs), `UNSUPPORTED_SCHEMA_VERSION` (newer bundle schema); `INTERACTION_REPLAY` request → `UNSUPPORTED_REPLAY_MODE` (deferred); `FRESH_EXECUTION` bundles carry `determinismClaim: NONE`
- [x] 5.3 Write `lab/replay.test.ts`: clean replay → projection-identical; verdict-preserving tamper → rejected by integrity before re-scoring; modified captured observation → REPLAY_MISMATCH with completedEvaluation preserved; each guard code asserted; digest-rewritten-alongside limitation documented in a test name/comment, not claimed tamper-proof

## 6. Fault injection (D6)

- [x] 6.1 Implement `lab/faults.ts` with the five deterministic in-process injections: evaluator failure, malformed result, missing trace, replay mismatch, duplicate result — each returns the affected case inputs so callers decide where evidence lands
- [x] 6.2 Write `lab/faults.test.ts` running every injection in a temp directory (never writing committed artifacts) and asserting exact semantics: evaluator failure/malformed → `EVALUATOR_ERROR` distinguishable from FAIL; missing trace → completed evaluation preserved + `evidenceIntegrity: FAILED`; replay mismatch detected; duplicate identity rejected with first-bundle-wins

## 7. Vertical slice (D7, D9)

- [x] 7.1 Implement `lab/experiments/` destructive-command-relay slice: read committed protected+vulnerable M0 traces from `results/m0/` (no re-execution of agent or gate), score each case via the M0 oracle + assertions so expected labels come from observed behavior (protected ≠ auto-PASS, vulnerable ≠ auto-FAIL)
- [x] 7.2 Wire keyless judging: heuristic judge plus committed `modelVerdicts` fixtures with full provenance (origin HEURISTIC/SYNTHETIC/LIVE_CAPTURE, judgeId, hashes, raw response, parsed label); live multi-judge behind an opt-in flag never required for reproduction
- [x] 7.3 Implement `lab/run.ts` Generate mode end to end: per-case bundles, dataset agreement record naming contributing case IDs, artifact-replay determinism result, and the five canonical fault-demonstration bundles explicitly labeled as demonstrations and excluded from statistics
- [x] 7.4 Generate `results/lab/REPORT.md` from bundles with zero hand-authored numbers: per-case results, agreement with exclusion/NA-reason counts, replay outcome, fault summaries, deferral of interaction replay, #142 SHA caveat, claim boundary (reproducible evaluation semantics, not security efficacy; hypothesis machinery-only)

## 8. Drift protection and verification

- [x] 8.1 Add regeneration drift tests (analogous to `m0-table.test.ts`): regenerate bundles and `REPORT.md` from committed inputs and fail on any difference from committed artifacts
- [x] 8.2 Run the full vitest suite and record split status honestly per #127 (write output to a file and read it back per #123; absent tooling reported as broken baseline, never manufactured green per #122)
- [x] 8.3 Confirm non-regression: `git diff` shows zero changes under `src/`, `benchmarks/m0/`, and `results/m0/`; proxy/CLI/router/report consumers untouched
- [x] 8.4 Claim-honesty pass on `REPORT.md` against the lab-vertical-slice spec scenarios: no sentence attributes attack-prevention efficacy to the Lab, no calibrated-abstention results reported, κ framed as recorded-label agreement under keyless reproduction, five-case floor framed as policy not precision

## 9. Done criteria

- [x] 9.1 A reviewer can clone, run `npx tsx lab/run.ts`, inspect bundles, replay them, run the fault tests, and see the five-state semantics reproduce from committed evidence with zero API keys — then `openspec validate add-agentguard-lab --strict` still passes
