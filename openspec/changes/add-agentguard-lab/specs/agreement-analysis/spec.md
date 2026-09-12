# Spec Delta: agreement-analysis

## ADDED Requirements

### Requirement: Agreement is computed from individual judge labels at dataset level
The Lab SHALL compute inter-judge agreement (Cohen's κ per judge pair) across the cases of an experiment from each judge's per-case label, never from fused outcomes and never from a single judgment; the Lab MUST NOT read the per-judgment `kappa` field of `FusedVerdict`. A case whose fused result is `ABSTAIN` SHALL still contribute to a pair's contingency table when both judges of that pair supplied valid labels for it. Inclusion and exclusion decisions SHALL be reported per pair.

#### Scenario: Fused abstention does not discard a valid pair
- **WHEN** a case's fused outcome is `ABSTAIN` but judges A and B each recorded a valid label for it
- **THEN** the case stays in A–B's contingency table and the report notes the pair-level inclusion

#### Scenario: Pairwise kappa across cases
- **WHEN** an experiment contains cases each labeled by judges A, B, and C
- **THEN** the analysis reports κ for A–B, A–C, B–C, each computed over the case set, not per case

### Requirement: Kappa mathematics and kappa policy are distinct, with reason-coded NA
Cohen's κ is mathematically undefined only when the expected-agreement denominator is zero (expected agreement = 1); the Lab SHALL report `NA` with reason `UNDEFINED_EXPECTED_AGREEMENT` in that case. Independently, the Lab's reporting policy SHALL withhold a numeric κ (report `NA`) unless both conservative rules hold: at least 5 valid paired cases (reason `INSUFFICIENT_PAIRED_CASES`) and both label classes represented by each judge of the pair (reason `INSUFFICIENT_LABEL_VARIATION`). The specs and report MUST state that these are project reporting policy, not universal mathematical requirements for κ, and that five cases is not evidence of adequate statistical precision. `NA` is never rendered as 0, never as 1, never as a fabricated statistic.

#### Scenario: Constant-label judge with defined kappa
- **WHEN** judge A labels five co-labeled cases `PASS` and judge B labels them `PASS PASS PASS FAIL FAIL` (observed agreement 0.6, expected agreement 0.6, κ = 0, mathematically defined)
- **THEN** the Lab reports `NA` with reason `INSUFFICIENT_LABEL_VARIATION`, and the report states that κ was defined but withheld by policy

#### Scenario: Insufficient paired cases
- **WHEN** judges A and B co-labeled only 4 valid cases
- **THEN** κ(A,B) is `NA` with reason `INSUFFICIENT_PAIRED_CASES`

#### Scenario: Undefined expected agreement
- **WHEN** a pair's co-labeled cases give an expected agreement of exactly 1 (both judges constant on the same label)
- **THEN** κ is reported `NA` with reason `UNDEFINED_EXPECTED_AGREEMENT`, distinguished in the report from the policy reasons

#### Scenario: Preconditions satisfied
- **WHEN** a judge pair has ≥5 valid paired cases, each judge using both label classes, and expected agreement below 1
- **THEN** κ is a numeric value computed from the contingency table

### Requirement: The aggregate is meanPairwiseKappa
The Lab SHALL define its multi-judge aggregate as the unweighted arithmetic mean of the available pairwise κ values, explicitly labelled `meanPairwiseKappa`, reported with the included and excluded pair counts. The Lab MUST NOT label any aggregate "Cohen's κ for all judges".

#### Scenario: Aggregate naming and counts
- **WHEN** three judge pairs exist and one returns `NA`
- **THEN** the report shows `meanPairwiseKappa` computed over the 1-value set with 2 included and 1 excluded pair stated, each excluded pair showing its NA reason

### Requirement: Explicit non-numeric label handling
Cases where an individual judge has no valid label (missing, or that judge timed out) SHALL be excluded from that pair's contingency table and counted as excluded. Cases whose evaluation is `EVALUATOR_ERROR` or null, or whose `evidenceIntegrity.status` is `FAILED`, SHALL be counted and reported separately, never silently dropped.

#### Scenario: Abstentions excluded and counted
- **WHEN** 3 of 20 cases carry no valid individual-judge label for pair A–B
- **THEN** the contingency table uses the remaining co-labeled valid cases and the report states "3 excluded (no valid label)"

#### Scenario: Evaluator errors surfaced, not hidden
- **WHEN** 2 cases carry `EVALUATOR_ERROR` for a judge
- **THEN** those cases are excluded from κ's table and the analysis explicitly reports the error count

### Requirement: Agreement persisted with the experiment
Dataset agreement results SHALL be stored alongside the experiment's bundles (per-pair κ or `NA` with reason code, valid-pair counts, exclusion counts, `meanPairwiseKappa` with included/excluded pair counts) so a reviewer can trace each statistic to the exact case set that produced it.

#### Scenario: Traceable statistic
- **WHEN** a reviewer opens the agreement record for an experiment
- **THEN** it names the case IDs contributing to each pair's table and the exclusions applied
