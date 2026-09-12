# ADR-0002: Seeded-stochastic simulated agent, real-LLM deferred to M1

**Date**: 2026-09-08
**Status**: accepted
**Deciders**: grilling session (Q2, Q11)

## Context

M0 must run keyless and be reproducible by any reviewer, but a purely scripted tracer run 20 times yields 20 identical outcomes and a degenerate confidence interval. The paper's phrase "tool-using LLM agents" also implies a real model somewhere in the loop.

## Decision

The default tracer is a simulated agent whose compliance policy is driven by a seeded RNG over a `trust_probability` parameter. Same `--seed` reproduces the exact outcome sequence; different seeds genuinely vary it. A `--llm` adapter is provided as an interface but the real model is run in the later M1 study, not M0. `trust_probability` is documented as a calibration constant of the simulator, not an empirical estimate of LLM behavior.

## Alternatives Considered

### Alternative 1: Deterministic scripted tracer
- **Pros**: Simplest, fully reproducible.
- **Cons**: 20 identical runs; binomial CI is meaningless; no real distribution.
- **Why not**: It defeats the statistical point of the 20-run design.

### Alternative 2: Always call a real LLM in M0
- **Pros**: Literal "LLM agent".
- **Cons**: Needs API keys; not reproducible offline; conflates gateway effect with model variance.
- **Why not**: Belongs in M1, where the existing Llama-3.1-8B/Groq harness already runs.

## Consequences

### Positive
- Keyless, instant, and reproducible while producing a genuine distribution.
- Clean seam for M1 to drop in a real model without changing the oracle.

### Negative
- M0 numbers describe a simulator, so they cannot be quoted as LLM susceptibility.

### Risks
- A reader treats ASR as real-LLM attack rate. Mitigated by ADR-0006 and the results-table label.
