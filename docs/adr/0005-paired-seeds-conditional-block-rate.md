# ADR-0005: Paired seeds + conditional Block Rate as the headline statistic

**Date**: 2026-09-08
**Status**: accepted
**Deciders**: grilling session (Q14, Q15, Q16)

## Context

The Vulnerable and Protected arms measure the same attack families, and `stats.ts` already offers `wilsonCI`, `compareRuns`, and `isSignificant` (two-proportion CI-overlap). The question is how to express the gateway's effect without discarding the experimental design.

## Decision

Run each attack family with the **same seed through both arms** (paired). Report Wilson CIs per cell as descriptive statistics, but make the **headline the paired conditional Block Rate**: blocked forbidden-call attempts in the Protected arm ÷ forbidden-call attempts observed in the Vulnerable paired arm. The fixed denominator (vulnerable-arm attempts) stops the ratio from moving with protected-arm behavior. ΔASR is reported alongside. Do **not** use `isSignificant()` for the M0 verdict. The gate metric is named **Block Rate**, kept separate from the existing text-refusal "detection rate".

## Alternatives Considered

### Alternative 1: Independent seeds per arm + CI-overlap significance
- **Pros**: Uses the existing `compareRuns`/`isSignificant` helpers directly.
- **Cons**: Throws away the pairing; CI-overlap is conservative and reports "not significant" on a clean 16/20→1/20 result.
- **Why not**: Under a strict-subset gate the protected-exec/vulnerable-block cell is near-empty, so the paired one-sided count is both simpler and correct.

### Alternative 2: Call the gate metric "detection rate"
- **Pros**: Sits next to the garak table.
- **Cons**: Collides with run.js's text-refusal meaning.
- **Why not**: "Block Rate" for the gate, "ASR" for the outcome; the axis mapping stays honest.

## Consequences

### Positive
- ΔASR and Block Rate are attributable to the gateway alone, not seed luck.
- Conditional Block Rate has a stable, well-defined denominator.

### Negative
- Paired design means a bug in one arm's seed handling biases both; the trace records the seed to catch this.

### Risks
- n=20 intervals get read as publication-grade. Mitigated by ADR-0006 and the table label (pipeline-validation uncertainty).
