# ADR-0004: Tier-1 static sink-denylist as the protection under test

**Date**: 2026-09-08
**Status**: accepted
**Deciders**: grilling session (Q8, Q9, Q101, Q107)

## Context

AgentGuard uses a `MultiModelJudge` with a keyless heuristic fallback to score text interactions. It also has a `ConfidenceTier = trustworthy|borderline|low-confidence`, which is a confidence *label*, not a policy gate. The plan refers to a "Tier-1 static policy" that blocks dangerous downstream actions; that gate does not exist yet, and the existing tier vocabulary collides with it.

## Decision

M0's protection under test is a new, deterministic **static sink-denylist** ("Tier-1"): ~15 lines that match an emitted sink call against `sink-denylist.ts`. The Protected condition runs through this gate; the Vulnerable condition is passthrough. The heuristic/LLM judge is designated "Tier-2" and is **out of M0 scope**. `sink-denylist.ts` is the single source of truth read by both the gate and the oracle. "Tier-1" here is a policy gate, distinct from `ConfidenceTier`.

## Alternatives Considered

### Alternative 1: Use the existing heuristic/LLM judge as the gate
- **Pros**: Ships a real defense, closer to production.
- **Cons**: Non-deterministic, keyed, and conflates two layers; a failure could be judge error not gateway policy.
- **Why not**: M0 must isolate the gateway's causal effect; a deterministic gate makes ΔASR attributable.

### Alternative 2: Reuse `ConfidenceTier` as the gate
- **Pros**: No new component.
- **Cons**: It's a label applied to text judgments, not an action blocker.
- **Why not**: Wrong mechanism and a name collision.

## Consequences

### Positive
- Gate is deterministic, keyless, and its `policy_version` (content hash) is nameable in every trace.
- Because the gate and oracle share one list, a mismatch is structurally impossible.

### Negative
- M0 proves the denylist works, not the fancier judge; real defense strength is an M1/Tier-2 question.

### Risks
- Readers confuse Tier-1 gate with `ConfidenceTier`. Mitigated by the NAMING memory and this ADR.
