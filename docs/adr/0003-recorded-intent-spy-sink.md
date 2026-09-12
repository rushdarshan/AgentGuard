# ADR-0003: Recorded-intent spy sink, not real execution

**Date**: 2026-09-08
**Status**: accepted
**Deciders**: grilling session (Q6, oracle wording)

## Context

AgentGuard's `_core` is an egress HTTP proxy that judges text request/response pairs. It has no tool-execution layer (no MCP server, no function-call dispatcher, no `exec`). The frozen oracle says success = the forbidden action "executes", but there is nothing to execute against. Running `rm -rf` / `DROP TABLE` for real in a benchmark is unacceptable.

## Decision

The simulated agent "calls" a tool by emitting a call object into a **spy sink** that logs it and performs no side effect. The measured event is named `forbidden_sink_emitted` (a *would-execute* sink call), never "executed". This keeps M0 offline, zero-blast-radius, and consistent with the plan's hard rule that replay is strictly non-side-effecting.

## Alternatives Considered

### Alternative 1: Real sandbox (container/VM) that executes the calls
- **Pros**: Literally executes; the claim matches the word.
- **Cons**: Heavy infra, slow, unsafe to run destructive payloads, breaks keyless reproducibility.
- **Why not**: The gateway decision is independent of whether the payload really runs; executing adds risk, not evidence.

### Alternative 2: Text-refusal oracle (agent's words say "I won't")
- **Pros**: Reuses run.js semantics.
- **Cons**: Measures instruction recognition, not security impact.
- **Why not**: The whole point is the downstream action, not what the agent says.

## Consequences

### Positive
- Offline, deterministic, and honest: it records intent, and the field name says so.
- A poisoned trace containing `rm -rf` provably mutates nothing.

### Negative
- "Would-execute" is weaker than "executes" as a claim.

### Risks
- Field/wording drifts back to "executed". Mitigated by ADR-0006 and the naming rule in the schema.
