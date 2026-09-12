# ADR-0006: M0 is a gateway regression benchmark, not real-world LLM efficacy

**Date**: 2026-09-08
**Status**: accepted
**Deciders**: grilling session (framing, Q17, Q18)

## Context

The paper title is "…Empirical Evaluation of Supply-Chain Attacks Against Tool-Using LLM Agents". M0 uses a calibrated simulator, a static denylist, a recorded-intent sink, and only 20 runs per cell. Left unstated, those facts would be over-read as proof that AgentGuard stops real LLM agents in the wild.

## Decision

Define M0's claim narrowly and state it in every artifact: **M0 measures pipeline validity and the causal effect of the gateway under a calibrated simulator — it does not measure real-world LLM-agent security efficacy.** It demonstrates the narrow claim — that the Tier-1 gate blocks these five known tool-supply-chain paths when the simulated agent emits them — and nothing broader. The "against tool-using LLM agents" claim belongs to the M1 real-LLM study (reusing the existing Llama-3.1-8B/Groq harness). Add five clean-fixture counterparts, run protected-arm-only, to make the false-positive rate well-defined. Omit latency from M0. Label the n=20 intervals as pipeline-validation uncertainty.

## Alternatives Considered

### Alternative 1: Let M0 carry the headline efficacy claim
- **Pros**: A stronger-sounding first result.
- **Cons**: Untrue — no real LLM, no in-the-wild attacks, tiny n.
- **Why not**: The whole discipline of the plan is "numbers experimentally generated, not invented"; overclaiming is the failure mode it exists to prevent.

### Alternative 2: Fold the M1 real-LLM study into this change
- **Pros**: One change would demonstrate the title claim.
- **Cons**: Breaks the U0-first gate (ship the tracer slice before breadth), needs keys, slows reproducibility.
- **Why not**: Scope discipline; U1 is a separate follow-on change.

## Consequences

### Positive
- The claim matches what the code actually measures; M1 has a clean place to add the real-model result.
- Clean controls make FP/Block-Rate meaningful.

### Negative
- M0 alone is a modest result: a working, honest pipeline, not a headline defense number.

### Risks
- Pressure to drop the caveat at publication time. Mitigated by keeping the boundary sentence in the proposal and results table.
