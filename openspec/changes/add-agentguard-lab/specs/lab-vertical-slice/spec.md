# Spec Delta: lab-vertical-slice

## ADDED Requirements

### Requirement: Slice consumes committed M0 observations by default
The vertical slice SHALL run one M0 `destructive-command-relay` family through the Lab layer by consuming the committed protected and vulnerable M0 observations (traces) — the default slice MUST NOT re-execute the M0 agent or gate. Expected labels SHALL come from observed behavior plus the M0 oracle, never from the arm name: a protected-arm case is not automatically `PASS` and a vulnerable-arm case is not automatically `FAIL`.

#### Scenario: No re-execution
- **WHEN** `npx tsx lab/run.ts` runs the default slice
- **THEN** agent and gateway outputs are read from committed M0 traces and no simulated-agent run occurs

#### Scenario: Arm name is not a verdict
- **WHEN** a protected-arm case's recorded observations show a forbidden-call emission that the oracle marks as a success
- **THEN** the case's evaluation outcome is `FAIL` despite the protected arm label

### Requirement: Slice produces the full evidence chain end to end
The slice SHALL produce, for each case: an `EvidenceBundle` with the three-part result structure, a dataset-level agreement record over the family's co-labeled cases (individual judge labels, `meanPairwiseKappa` with NA reasons where policy withholds), an artifact replay proving canonical-projection determinism, and the five fault-demonstration records per the fault-injection spec.

#### Scenario: End-to-end evidence
- **WHEN** the slice completes
- **THEN** every bundle's chain (decision → result → assertions → observations → traces → inputs + versions) is traversable and the agreement record names its contributing case IDs

### Requirement: Keyless reproduction with declared provenance
The slice SHALL run without API keys using the heuristic judge, with committed `modelVerdicts` fixtures carrying full provenance (`origin: HEURISTIC`, judgeId, config/input hashes, raw response, parsed label). Live multi-judge execution is opt-in. The generated report SHALL state that agreement is heuristic-vs-heuristic under keyless reproduction.

#### Scenario: Clone-and-run
- **WHEN** a reviewer clones the repository and runs the slice command with no keys
- **THEN** the experiment completes and every recorded label's provenance is inspectable

### Requirement: Generated report with claim boundary
The slice SHALL emit `results/lab/REPORT.md` generated from bundles with zero hand-authored numbers, including: per-case results, agreement statistics with exclusion and NA-reason counts, replay determinism outcome, fault-demonstration summaries, and the claim boundary — the Lab demonstrates reproducible evaluation semantics, not security efficacy, and the calibrated-abstention hypothesis is machinery-only in this change (no novelty claim, no headline numbers).

#### Scenario: Report regenerates identically from bundles
- **WHEN** the drift test regenerates `REPORT.md` from committed bundles
- **THEN** the output matches the committed report byte-for-byte

#### Scenario: No unsupported claims
- **WHEN** the report is reviewed against its claim boundary
- **THEN** no sentence attributes attack-prevention efficacy to the Lab or reports calibrated-abstention results
