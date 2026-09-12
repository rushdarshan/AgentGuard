# Proposal: add-agentguard-lab

## Why

AgentGuard's current evaluation semantics conflate distinct states: `FusedVerdict` already carries `consensus`/`kappa`/`unstable`, but its boolean `passed` collapses outcome semantics, κ is computed at the wrong level (per single judgment — first judge vs. rest — instead of across a dataset), and results carry no structured evidence chain from a verdict back to the raw observations and exact versions that produced it. The AgentGuard Lab foundation change fixes these contracts — verdict semantics, dataset-level agreement, evidence bundles, and replay modes — so the broader Lab program (benchmark suites, distributed execution, calibration research) can be built on provable machinery instead of an unbacked architecture claim.

## What Changes

- New `AgentGuard/lab/` module defining the foundation contracts (TypeScript-first, no new runtime stack):
  - Three-part case-result model: `completedEvaluation` (outcome ∈ `PASS`, `FAIL`, `ABSTAIN`, `EVALUATOR_ERROR`, or null), `evidenceIntegrity` (COMPLETE/FAILED with findings), and the reported `result` — the five locked states, with `INFRASTRUCTURE_ERROR` derived from broken evidence rather than stored as an evaluation outcome — so "the system failed", "the evaluator couldn't tell", and "the evidence chain broke" are never conflated and never overwrite each other.
  - One-way `FusedVerdict → EvaluationResult` adapter as the compatibility boundary, defined as an ordered precedence table (invalid envelope → `EVALUATOR_ERROR`; no/insufficient valid survivors → `EVALUATOR_ERROR`; instability or unresolved disagreement → `ABSTAIN`; partial-but-sufficient agreement → `PASS`/`FAIL` marked degraded; complete valid decision → `PASS`/`FAIL`; contradictory legacy fields → `EVALUATOR_ERROR`), with legacy `passed` polarity documented as safe/complied=true from the code, not inferred. Existing proxy, CLI, routers, and reports continue using `FusedVerdict` untouched; no inline-enforcement changes.
  - Dataset-level agreement analysis from individual judge labels (never fused outcomes): per-pair Cohen's κ with `meanPairwiseKappa` as the explicitly named aggregate; κ reported only where the stated policy preconditions hold (≥5 valid paired cases, both label classes per judge, expected agreement < 1), otherwise `NA` with a reason code — with the specs stating these are conservative reporting policy, not mathematical requirements.
  - `EvidenceBundle` as the central object: every case produces a bundle linking release decision → result → assertions → raw observations → traces → exact input versions (`targetVersion`, `datasetVersion`, `evaluatorVersion`, `bundleSchemaVersion`), with content-hash versions over a sorted path+digest manifest of the full declared evaluator input set, case identity as sourceCaseId+arm+seed+scenario, Generate/Verify/Replay command modes, fixture provenance as a release requirement, and the parent-Git-SHA caveat preserved.
  - Replay-mode semantics in the contract: `ARTIFACT_REPLAY` (re-score captured outputs; required; determinism judged on a stable canonical projection excluding volatile fields), `INTERACTION_REPLAY` (declared, deferred — requests fail with `UNSUPPORTED_REPLAY_MODE`), `FRESH_EXECUTION` (existing execution path, explicitly labelled non-deterministic). Artifact integrity (`ARTIFACT_INTEGRITY_MISMATCH`) and verdict reproducibility (`REPLAY_MISMATCH`) are distinct checks, with `EVALUATOR_VERSION_MISMATCH` and `UNSUPPORTED_SCHEMA_VERSION` guards.
  - Minimal fault semantics proven by injection: evaluator failure, malformed evaluation result, missing trace/evidence, replay mismatch, duplicate execution/result.
- One vertical slice seeded from the existing M0 `destructive-command-relay` attack family (M0 itself stays intact as the Suite-B baseline/seed): the default slice consumes committed protected/vulnerable M0 observations without re-executing them, expected labels come from observed behavior plus the oracle (arm name is never a verdict) → per-case three-part result + bundle → dataset agreement over recorded judge labels → artifact replay → injected evaluator failure → replay-mismatch detection.
- Keyless reproducibility: the reproducible path uses the heuristic judge plus committed `modelVerdicts` fixtures; live multi-judge execution is optional and never required for reproduction.
- Generated, committed artifacts under `AgentGuard/results/lab/` (per-case bundles, `index.jsonl`, `REPORT.md` derived from bundles with zero hand-authored numbers) plus a regeneration/drift test analogous to `m0-table.test.ts`.
- Deliverable command: `npx tsx lab/run.ts` executes the whole slice end to end.

**Explicitly out of scope** (follow-on changes): Kubernetes, REANA, ROOT/scientific workflows, Python services, full RAG suite, full agent suite, distributed execution, production proxy enforcement changes, calibration research results, large benchmark expansion.

## Capabilities

### New Capabilities

- `evaluation-verdict`: The three-part case-result model (`completedEvaluation` / `evidenceIntegrity` / reported five-state `result`), and the documented one-way `FusedVerdict` adapter as an ordered precedence table; what each state means and what may never be conflated.
- `agreement-analysis`: Dataset-level inter-judge agreement over individual judge labels — per-pair κ and the named `meanPairwiseKappa` aggregate, `NA` with reason codes where policy withholds — including abstention/missing/error handling and the policy-vs-mathematics distinction.
- `evidence-bundle`: Bundle schema with three-part results, case identity and command modes, filesystem storage layout, content-derived versioning over a declared input manifest, fixture provenance, the decision→evidence traceability chain, and regeneration/drift guarantees.
- `replay-semantics`: The three replay modes (artifact required, interaction deferred), canonical-projection determinism, and the distinct integrity/reproducibility/version/schema checks with their codes.
- `fault-injection`: The five foundation faults and the verdict/bundle semantics each must produce.
- `lab-vertical-slice`: The M0-seeded `destructive-command-relay` experiment, keyless fixture policy, `lab/run.ts` entry point, and generated `REPORT.md`.

### Modified Capabilities

None — `openspec/specs/` is empty, and existing AgentGuard behavior (proxy, CLI, routers, reports, `benchmarks/m0/`) is consumed, not modified.

## Impact

- **Implementation root**: `res/AgentGuard/` (this change's specs live in `res/openspec/`; all code lands in the existing AgentGuard repo — no second implementation tree may be created).
- **New code**: `AgentGuard/lab/` (verdict, adapter, agreement, bundle, replay, faults, experiments) and `AgentGuard/results/lab/`.
- **Touched read-only**: `benchmarks/m0/` fixtures and harness patterns (referenced/consumed; M0 methodology is not rewritten); `_core/judge.ts` is read/consumed by the adapter — no changes to existing judge behavior.
- **Dependencies**: none added (Node + TypeScript + tsx + vitest, all already in use).
- **Application narrative**: AgentGuard Lab is the umbrella technical identity; AegisMCP/M0 is its first benchmark workload. This change declares the research hypothesis — *can a version-aware evaluator with calibrated abstention reduce false release approvals vs. single-judge and ensemble baselines at a fixed review budget?* — and explicitly does **not** claim to answer it: this change implements only the machinery required to test it. Milestones: Sep 16, 2026 = first defensible demoable slice (Mitacs/CUC evidence); Nov 1, 2026 = CERN STI maturity target served by follow-on changes.
