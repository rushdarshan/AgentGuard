# Gates: add-agentguard-lab evidence-validation fixes

OWNS: lab/**, results/lab/**, unlazy-gates/check.mjs

Scope: Close the nine evidence-validation gaps in the Lab foundation without changing locked contracts, then re-verify end to end.

Environment note: this machine cannot spawn shells or child processes from
node (cmd.exe/pwsh/node all ENOENT under node:child_process; only direct
shell execution works). unlazy-gates/check.mjs therefore cannot execute here
(the gate-check.mjs runner fails the same way). Every gate below was executed
as its direct CHECK command in PowerShell, exit 0, with the decisive output
recorded in EVIDENCE. In a normal terminal the dispatcher works unchanged.

- [x] G1: Bundle identity digest excludes bundleId, readBundle verifies digest and schema
  CHECK: npx vitest run lab/bundle.test.ts; if ($LASTEXITCODE -eq 0) { 'GATE G1 PASSED' }
  EXPECT: GATE G1 PASSED
  EVIDENCE: pwsh, C:\Users\rushd\Downloads\res\AgentGuard, exit 0; bundle.test.ts passed incl. stale-bundleId exclusion, BUNDLE_ID_MISMATCH on verdict-preserving tamper, INVALID_BUNDLE_SCHEMA rejection (full run: 28 files / 183 tests green)

- [x] G2: Embedded observations validated against the referenced trace record
  CHECK: npx vitest run lab/experiments/destructive-command-relay.test.ts; if ($LASTEXITCODE -eq 0) { 'GATE G2 PASSED' }
  EXPECT: GATE G2 PASSED
  EVIDENCE: pwsh, repo root, exit 0; lineage null on intact bundles, OBSERVATION_LINEAGE_MISMATCH on verdict-preserving observation tamper

- [x] G3: Evaluator version covers the full declared input set including scoring code and fixtures
  CHECK: npx vitest run lab/replay.test.ts; if ($LASTEXITCODE -eq 0) { 'GATE G3 PASSED' }
  EXPECT: GATE G3 PASSED
  EVIDENCE: pwsh, repo root, exit 0; EVALUATOR_INPUTS contains the experiment scoring file + 5 M0 fixture sources, excludes report/tests; one-byte oracle mutation and one-byte fixture mutation each change the version; incomplete tree throws EVALUATOR_INPUT_MISSING

- [x] G4: CLI has generate, verify, and replay modes, verify and replay write nothing
  CHECK: npx vitest run lab/run-modes.test.ts; if ($LASTEXITCODE -eq 0) { 'GATE G4 PASSED' }
  EXPECT: GATE G4 PASSED
  EVIDENCE: pwsh, repo root, exit 0; 8/8 incl. parseArgs modes/flags/rejections, verify+replay byte-identical directory snapshots, INTERACTION_REPLAY UNSUPPORTED_REPLAY_MODE, tampered bundle fails verify untouched, trace drift fails lineage untouched

- [x] G5: Duplicate publication rejected outside generate mode, index keys experiment plus case
  CHECK: npx vitest run lab/bundle.test.ts; if ($LASTEXITCODE -eq 0) { 'GATE G5 PASSED' }
  EXPECT: GATE G5 PASSED
  EVIDENCE: pwsh, repo root, exit 0; DUPLICATE_IDENTITY_CONFLICT names both bundle ids under verify+replay, canonical artifact unchanged, identical rewrite idempotent, index holds exp-a + exp-b for one caseKey

- [x] G6: Agreement persisted with contributing case IDs, tables, and per-pair exclusion reasons
  CHECK: npx vitest run lab/agreement.test.ts; if ($LASTEXITCODE -eq 0) { 'GATE G6 PASSED' }
  EXPECT: GATE G6 PASSED
  EVIDENCE: pwsh, repo root, exit 0; known-kappa 0.6154 with contributingCaseIds + contingency, DUPLICATE_LABEL/NO_VALID_LABEL/JUDGE_ERROR/BROKEN_EVIDENCE exclusions each counted with reason, evaluatorErrorCases + brokenEvidenceCases reported, agreement.json round-trips byte-identical, absent record throws MISSING_AGREEMENT_RECORD

- [x] G7: Faults injected at dependency boundaries and detected by the production path
  CHECK: npx vitest run lab/faults.test.ts; if ($LASTEXITCODE -eq 0) { 'GATE G7 PASSED' }
  EXPECT: GATE G7 PASSED
  EVIDENCE: pwsh, repo root, exit 0; evaluator_failure -> null/EVALUATOR_ERROR via throwing evaluator, malformed -> INVALID_ENVELOPE via real adapter, missing_trace -> MISSING_TRACE via removed entry + checkEvidenceIntegrity, replay_mismatch -> REPLAY_MISMATCH via mutated observations + real replay(), duplicate -> DUPLICATE_LABEL via computeAgreement + intake rejection; demo bundles committed under exp-fault-demonstrations-v1 and re-verified

- [x] G8: Drift protection covers report, bundles, agreement, and fixtures, absent artifacts fail
  CHECK: npx vitest run lab/report.drift.test.ts lab/bundle-drift.test.ts; if ($LASTEXITCODE -eq 0) { 'GATE G8 PASSED' }
  EXPECT: GATE G8 PASSED
  EVIDENCE: pwsh, repo root, exit 0; REPORT.md regenerates byte-identical from committed bundles (no skip; absent file throws), 60/60 stable bundle digests match fresh regeneration, agreement + fixtures match canonically, 5 demo bundles committed and flagged

- [x] G9: Report carries fault summary, deferral notes, caveats, NA reasons, and honest claims
  CHECK: npx vitest run lab/report.test.ts; if ($LASTEXITCODE -eq 0) { 'GATE G9 PASSED' }
  EXPECT: GATE G9 PASSED
  EVIDENCE: pwsh, repo root, exit 0; null numerics render NA with INSUFFICIENT_PAIRED_CASES named and no em-dash anywhere, heuristic-vs-heuristic + machinery-only boundary present, INTERACTION_REPLAY deferral + UNSUPPORTED_REPLAY_MODE + parent-SHA caveat present, fault section from re-checked bundles, banned overclaim phrases absent

- [x] G10: Lab typecheck clean, lab suite green, openspec strict valid, committed evidence verifies
  CHECK: node unlazy-gates/lab-typecheck.mjs && npx vitest run lab && openspec validate add-agentguard-lab --strict && npx tsx lab/run.ts --mode=verify && npx tsx lab/run.ts --mode=replay && echo 'GATE G10 PASSED'
  EXPECT: GATE G10 PASSED
  EVIDENCE: pwsh, repo root, all exit 0 (lab-typecheck.mjs stepwise: npx tsc --noEmit shows zero lab/ lines, remainder is the pre-existing src/ baseline); full repo suite 28 files / 183 tests green; openspec: Change 'add-agentguard-lab' is valid; verify ok: 60 bundles, agreement, fixtures, REPORT.md all match; replay ok: 60/60 re-scored identically
