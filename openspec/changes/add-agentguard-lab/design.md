# Design: add-agentguard-lab foundation

## Context

AgentGuard's judging layer (`src/_core/judge.ts`) already returns a `FusedVerdict` carrying `consensus` (`unanimous|majority|conflict|partial`), optional `kappa`, optional `unstable`, and the raw `modelVerdicts`. The defects this change fixes are precise:

- `passed` is a single boolean that collapses "the system failed", "the judges disagreed", and "the judges could not run" into one value (e.g. all-judges-timed-out currently returns `passed: false, consensus: "conflict"` — indistinguishable from a clean FAIL).
- κ is computed per judgment, pairwise between the first stable verdict and the rest — a statistic about one decision, not about a dataset.
- No artifact links a verdict back to its inputs, observations, traces, and versions; the proxy blocks inline at `proxy.ts` with no replayable evidence chain.

The existing M0 benchmark (`benchmarks/m0/`) is an intact, committed, pipeline-validation experiment with fixtures for five tool-supply-chain attack families, a seeded-stochastic simulated agent, a Tier-1 sink-denylist gate, and a regeneration-drift-protected results table. M0 is the Suite-B seed for the Lab; it is consumed, never rewritten.

Constraints: TypeScript-first on the existing stack (Node, tsx, vitest) — no Python, FastAPI, or PostgreSQL; the reproducible path must run with zero API keys; implementation lands in `res/AgentGuard/` while planning lives in `res/openspec/`; existing consumers (proxy, CLI, routers, reports) must keep compiling and behaving unchanged. Stakeholder clocks: Sep 16, 2026 (Mitacs/CUC — demoable slice) and Nov 1, 2026 (CERN STI — maturity served by follow-on changes).

## Goals / Non-Goals

**Goals:**
- One case-result contract: `completedEvaluation` (four evaluation outcomes or null) + `evidenceIntegrity` (COMPLETE/FAILED with findings) → reported five-state `result`, defined and tested.
- A documented one-way compatibility boundary from `FusedVerdict` to `EvaluationResult`.
- Dataset-level agreement analysis that refuses to emit statistics when preconditions are unmet.
- An evidence bundle that lets a reviewer trace decision → verdict → assertions → observations → trace → exact versions.
- Replay-mode semantics with artifact replay proven deterministic on a stable canonical projection, and integrity vs reproducibility as separate checks.
- Five minimal fault semantics proven by injection (tests in temp dirs; CLI writes designated canonical demonstration records).
- One vertical slice seeded from committed M0 observations (`destructive-command-relay`, consumed without re-execution) exercising all of the above via `npx tsx lab/run.ts`, with committed keyless fixtures and a generated `REPORT.md`.

**Non-Goals:**
- Kubernetes, REANA, ROOT, Python services, distributed execution.
- Full RAG (Suite A) or full scientific-workflow (Suite C) suites; expansion beyond one attack family.
- Any change to production proxy enforcement or existing `FusedVerdict` consumers.
- Calibration research results; the version-aware calibrated-abstention hypothesis is declared, and this change builds only the machinery to test it.
- Rewriting or redesigning M0.

## Decisions

### D1 — Three-part case result: evaluation, evidence integrity, reported outcome

```ts
type EvaluationOutcome = "PASS" | "FAIL" | "ABSTAIN" | "EVALUATOR_ERROR";
type EvidenceStatus = "COMPLETE" | "FAILED";
type ReportedResult = EvaluationOutcome | "INFRASTRUCTURE_ERROR";
```

Every case execution carries three parts: `completedEvaluation: EvaluationResult | null` (outcome plus reason, evidence references, agreement metadata — null when the evaluation did not complete), `evidenceIntegrity: { status, findings[] }`, and the reported `result` — the five locked states, derived from the other two, never stored independently. ABSTAIN means the evaluation was validly executed but produced no determination (tie/unstable consensus); EVALUATOR_ERROR means the evaluator itself could not produce a verdict (all judges timed out, malformed judge output); INFRASTRUCTURE_ERROR is *not* an evaluation outcome — it is the reported consequence of a failed evidence chain or run environment: either before evaluation (target unreachable → `completedEvaluation: null`) or during evidence assembly after a completed evaluation (missing required trace → the completed evaluation is preserved as `FAIL`/`PASS`/… while `evidenceIntegrity.status = FAILED`).

*Why:* "what did the evaluation conclude", "is the evidence chain intact", and "what does the release decision report" are three questions; a two-field model lost the fifth reported state and a single five-value enum would overwrite the actual verdict when evidence breaks — exactly the conflation this contract exists to kill. Separate fields make the overwrite a type error. The boundary between EVALUATOR_ERROR and INFRASTRUCTURE_ERROR is *what failed*: the evaluator component vs the run environment or evidence chain (see D6). *Alternatives considered:* extending `FusedVerdict` in place — rejected (consumer re-audit, silent semantic shift). A single five-state outcome enum — rejected at review (overwrite risk). A two-field `evaluation` + `evidenceStatus` model — rejected at review: it silently deleted the fifth reported outcome, so reviewers had to derive it and implementations could store it inconsistently.

### D2 — One-way adapter as an ordered precedence table

`lab/adapter.ts` maps `FusedVerdict → EvaluationResult`; nothing maps back. Rules overlap on real inputs (an all-timeout verdict is simultaneously `passed:false`, `consensus:"conflict"`, and empty `modelVerdicts`; `passCount >= failCount` makes an even split `passed:true` *with* `consensus:"conflict"`), so the adapter is an ordered table — first match wins — asserted by tests:

| Order | Condition on `FusedVerdict` | Result |
|---|---|---|
| 1 | envelope invalid (missing `consensus`/`passed`, non-boolean `passed`, non-array `modelVerdicts`) | `EVALUATOR_ERROR` / `INVALID_ENVELOPE` |
| 2 | no valid individual judge label, or `consensus:"partial"` with fewer than 2 agreeing survivors | `EVALUATOR_ERROR` / `NO_VALID_JUDGMENTS` or `INSUFFICIENT_SURVIVORS` |
| 3 | `unstable: true` or `consensus:"conflict"` | `ABSTAIN` / `UNSTABLE` or `UNRESOLVED_DISAGREEMENT` |
| 4 | `consensus:"partial"`, ≥2 agreeing survivors | `PASS`/`FAIL` from survivors, `degraded: true` |
| 5 | `consensus:"unanimous"`/`"majority"` and `passed` agrees with the valid-label majority | `PASS`/`FAIL` |
| 6 | `consensus`/`passed`/labels mutually contradictory | `EVALUATOR_ERROR` / `CONTRADICTORY_FIELDS` |

Legacy polarity is documented from the code, not inferred: `passed: true` means the response was **safe** (target resisted / did not comply), per `judge.ts`. All-timeout is detected from the envelope (zero valid labels), never from an empty `modelVerdicts` array alone or the English `reasoning` string. The sufficiency rule (≥2 agreeing survivors) is stated in the `evaluation-verdict` spec, not left to conversion code — a partially failed evaluator must never silently become a normal `PASS`/`FAIL`.

The mappings are documented in code and asserted by tests, not buried in conversion logic. *Why:* the adapter is the compatibility boundary — the Lab gets clean semantics while the proxy keeps its legacy type. *Alternative:* unordered mapping rules — rejected at review: overlapping conditions made the outcome depend on evaluation order nobody had fixed. *Alternative:* dual-write both types from the judge — rejected: touches judge behavior, which is out of scope.

### D3 — Agreement lives at the dataset layer; `meanPairwiseKappa` is the named aggregate

`lab/agreement.ts` computes, over a set of cases, **per-pair Cohen's κ** for each judge pair (A–B, A–C, B–C) from the judges' **individual labels** — never from fused outcomes, so a fused ABSTAIN does not discard an otherwise valid judge pair. The aggregate is `meanPairwiseKappa`: the unweighted mean of the available pairwise κ values, reported together with the count of pairs included and excluded. It is never labelled "Cohen's κ for all judges" — that statistic does not exist here. Explicit rules: ABSTAIN and missing labels exclude the case from that pair's contingency table; EVALUATOR_ERROR cases are counted and reported separately, never silently dropped; a pair with zero valid paired cases is `NA` with an undefined-denominator reason, distinct from the insufficient-cases reason.

κ is emitted **only where the stated policy preconditions hold**: ≥5 valid paired cases, each judge of the pair carrying ≥2 distinct labels, and expected agreement < 1. These are **conservative reporting policy, not mathematical requirements** — the spec must not equate "expected agreement < 1" with the label-class rule (they are different conditions), and five cases is a policy floor, not evidence of adequate statistical precision. Otherwise the result is `NA` with a reason code — consistent with M0's #144 NA-never-zero convention. The per-judgment `kappa` field on `FusedVerdict` remains for legacy consumers and is never read by the Lab.

*Why:* κ across cases answers "do these judges agree as evaluators"; κ within one case answers nothing publishable. *Alternative:* keep computing κ per judgment and averaging — rejected: averages of degenerate single-case statistics are meaningless. *Alternative:* an all-judge agreement coefficient (Fleiss/Krippendorff) — rejected for this change: with three judges and per-case missingness, per-pair κ plus an honestly named mean is the least that reports the truth; a proper coefficient belongs with the calibration study.

### D4 — Evidence bundles are committed JSON on the filesystem, M0-proven pattern

`lab/bundle.ts` writes one bundle per case at `AgentGuard/results/lab/<experimentId>/<caseId>.json` plus `results/lab/index.jsonl`. Bundle fields: `bundleId`, `experimentId`, case identity as `sourceCaseId + arm + seed + scenario` (a separate `attemptId` is execution metadata, never identity), `targetVersion`, `datasetVersion`, `evaluatorVersion`, `bundleSchemaVersion`, `replayMode` (what was run) separate from `determinismClaim` (what may be asserted about it), `environment` (Node version, platform), `input`, `observations`, `traces`, `assertions`, the three-part result (`completedEvaluation` + `evidenceIntegrity`, with reported `result` derived), `agreement` (dataset-level, referenced at experiment scope), fixture provenance per judge label (`origin` LIVE_CAPTURE/SYNTHETIC/HEURISTIC, `judgeId`, model id, config/input hashes, raw response, parsed label), `timestamps`. Commands run in explicit modes — Generate (writes), Verify (recomputes and compares, writes nothing), Replay (re-scores captured inputs, writes nothing) — so "first bundle wins" governs duplicate *executions* without conflicting with regeneration. `datasetVersion`/`evaluatorVersion` are content hashes over a **sorted path+digest manifest of the full declared evaluator input set** (no ad-hoc comment stripping); `bundleSchemaVersion` is the schema's declared version; `targetVersion` is the parent Git SHA with the #142 caveat documented in the report. A regeneration test (analogous to `m0-table.test.ts`) fails if committed artifacts drift from a Generate-mode regeneration; `results/lab/REPORT.md` is generated from bundles with zero hand-authored numbers.

*Why:* git-diffable, keyless-reproducible, and the drift-protection pattern already exists and works in this repo. *Alternative:* SQLite or a JSON store behind a service — rejected: adds a runtime dependency and makes the evidence invisible in review.

### D5 — Three replay modes; determinism on a stable projection; integrity ≠ reproducibility

The contract defines `ARTIFACT_REPLAY` (re-score captured observations), `INTERACTION_REPLAY` (re-run the agent against recorded tool/model responses), and `FRESH_EXECUTION` (the existing path, explicitly labelled non-deterministic in every bundle). **Locked at review: interaction replay is deferred** to a follow-on change — it stays declared in the contract and any request for it fails clearly with `UNSUPPORTED_REPLAY_MODE`; the slice's report records the deferral. This change implements artifact replay fully; fresh execution is labelled, not built.

Two distinct checks, never merged:
- **Artifact integrity** — digests recorded in the bundle are verified against the stored artifacts *before* re-scoring. Tampering is `ARTIFACT_INTEGRITY_MISMATCH` even when the verdict is unchanged (a required test tampers a non-decision field and still expects rejection). Honest limitation: a self-contained bundle cannot authenticate data whose digest was rewritten alongside it — the digest chain protects against accidental corruption and records intent, and the report says so rather than claiming tamper-*proofness*.
- **Verdict reproducibility** — re-scoring intact artifacts must reproduce the verdict. "Identical" is judged on a **stable canonical projection** — outcome, `reasonCode`, stable evidence references, deterministic decision metadata — excluding wall-clock timestamps, durations, attempt IDs, and host paths. RFC 8785 (JCS) is the reference for key-order/number serialization; no JCS-compliance claim without a conformance test. A projection mismatch is a detected `REPLAY_MISMATCH` recorded as `evidenceIntegrity: FAILED` (the recorded evaluation is preserved), never a silent re-score. Version guards: evaluator input-set hash differs → `EVALUATOR_VERSION_MISMATCH`; bundle written by a newer schema → `UNSUPPORTED_SCHEMA_VERSION` — both integrity-side refusals, not mismatches.

*Why:* integrity answers "are the bytes what the bundle claims"; reproducibility answers "does re-scoring agree" — a tamper that leaves the verdict unchanged passes the second and must fail the first. *Alternative:* deep-equal on parsed objects — rejected: fails on serialization noise and passes on semantically different orderings. *Alternative:* byte equality of the whole serialized verdict — rejected at review: volatile fields (timestamps, attempt IDs) make it unsatisfiable, which is why the design's earlier "deep equality fails on formatting noise" framing was replaced by the projection definition.

### D6 — Five faults: proven by tests in temp dirs, demonstrated by the CLI in canonical records

`lab/faults.ts` provides deterministic injections the slice and its tests trigger: evaluator failure (judge throws/times out → `EVALUATOR_ERROR`), malformed result (unparseable judge output → `EVALUATOR_ERROR`), missing trace (the target evaluation completed, but bundle assembly finds no required trace → `evidenceIntegrity: FAILED` recorded alongside the completed evaluation, which is preserved — never a retroactive `FAIL` of the target), replay mismatch (tampered captured observation → detected, recorded), duplicate result (same case identity executed twice → second rejected/recorded, first bundle wins). Fault *evidence* is split by purpose: vitest cases inject faults only in temp directories and assert semantics — they never write committed artifacts; the CLI writes designated canonical fault-demonstration bundles (explicitly labeled as demonstrations) so `lab/run.ts` output shows the states without polluting experiment bundles. No fault service, no chaos lab.

*Why:* the foundation needs the *semantics* proven, not a distributed fault laboratory (follow-on). *Alternative:* fault-injection harness as a service — rejected: scope creep with zero contract coverage gain.

### D7 — Keyless agreement inputs: heuristic judge + committed `modelVerdicts` fixtures

The reproducible path labels each case with the keyless heuristic judge plus committed fixtures of real-model verdicts. Fixture provenance is a **release requirement**, not a nice-to-have: every stored label carries `origin` (LIVE_CAPTURE / SYNTHETIC / HEURISTIC), `judgeId`, model id, config/input hashes, the raw response, and the parsed label. Agreement is computed from these individual labels (D3), never from fused outcomes. Live multi-judge execution is an opt-in flag and never required for reproduction. Agreement statistics therefore describe the recorded labels, and the report says so — no claim about current live model behavior.

*Why:* matches the repo's standing rule that blind critics must reproduce without keys. *Alternative:* default live judging — rejected: unreproducible, and CI-hostile.

### D8 — `lab/` is a new top-level namespace; "AgentGuard Lab" is identity, not rename

```
AgentGuard/lab/{verdict,adapter,agreement,bundle,replay,faults}.ts
AgentGuard/lab/experiments/   # the destructive-command-relay slice
AgentGuard/lab/run.ts         # npx tsx lab/run.ts
AgentGuard/results/lab/       # beside results/m0/
```

`benchmarks/m0/` stays exactly as it is; the slice imports M0 fixtures/harness patterns read-only. *Alternative:* growing `benchmarks/` — rejected: the Lab is an evaluation platform, not a benchmark script, and the namespaces should say so.

### D9 — The slice consumes committed M0 observations; arm name is never a verdict

The default slice **consumes the committed protected/vulnerable M0 `destructive-command-relay` observations and does not re-execute M0** — the Lab layer evaluates the recorded agent behavior per case through the oracle/assertions. Expected labels come from observed behavior plus the oracle, never from the arm: `protected ≠ automatically PASS` and `vulnerable ≠ automatically FAIL` (a protected run whose agent still emitted a forbidden call, or a vulnerable run where the agent never attempted one, must score accordingly). This gives the dataset-agreement layer a real mixed-label distribution and proves FAIL vs EVALUATOR_ERROR distinguishability in the same artifact, alongside the injected evaluator-failure and replay-mismatch cases.

*Why:* re-executing M0 would make the Lab depend on M0's seeded-RNG runner and invite "Lab results disagree with M0" confusion for zero contract gain; consuming recorded observations is exactly what artifact replay is for. *Alternative:* run both arms fresh — rejected at review: contradicts the replay-first evidence model and M0's non-reproducibility of traces (#139/#140).

## Risks / Trade-offs

- [Committed judge fixtures drift from live judge behavior] → provenance metadata on every label (D7); report wording scopes κ to recorded labels; live-mode flag exists for refresh as a follow-on.
- [Content-hash `evaluatorVersion` changes on cosmetic edits or *fails* to change on unhashed inputs] → hash the full declared evaluator input set via a sorted path+digest manifest (D4); no ad-hoc normalization like comment stripping; document in the bundle spec.
- [Small-n family (M0's n=20/condition) makes κ noisy] → report κ with the same pipeline-validation framing as M0's CIs (#97), `NA` when preconditions unmet; the slice proves machinery, not statistics.
- [Reusing M0 fixtures without M0's runner could invite "results disagree with M0" confusion] → Lab results live only under `results/lab/`; report states the slice re-scores recorded fixtures, it does not re-run M0; `results/m0/` untouched.
- [Parent-SHA in bundles changes on every regeneration (#142)] → the stable human-facing artifact is the regenerated `REPORT.md`; SHA-bearing files are explicitly not treated as inherently stable.
- [Canonical projection is a new invariant everything must route through] → single exported `canonicalJson()` plus one `stableProjection()` in `lab/bundle.ts`; replay, integrity, and drift tests all assert against them, so a bypass fails loudly.

## Migration Plan

Purely additive: new `lab/` module, new `results/lab/` artifacts, no edits to existing files. Deploy = merge. Rollback = delete `lab/` and `results/lab/`; nothing else can be affected because no existing consumer imports the Lab. No data migration, no proxy cutover, no M0 change.

## Open Questions

None open. Resolved by review:

- Interaction replay: **deferred** to a follow-on change; declared in the contract, requests fail with `UNSUPPORTED_REPLAY_MODE`, deferral recorded in the slice's report (D5).
- κ thresholds: written into the `agreement-analysis` capability spec as **conservative reporting policy** (≥5 valid paired cases, both label classes per judge, expected agreement < 1), explicitly not mathematical requirements and not a precision claim (D3).
