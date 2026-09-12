# ADR-0001: M0 benchmark lives in TypeScript inside AgentGuard

**Date**: 2026-09-08
**Status**: accepted
**Deciders**: grilling session (Q1)

## Context

The AegisMCP plan (docs/plans) described the U0/M0 tracer slice as a Python package (`python -m aegis.benchmarks`, pydantic, `orjson`). AgentGuard, the repo it extends, is TypeScript (React/tRPC/drizzle/vitest/tsx) with an existing JS benchmark harness (`benchmarks/run.js`). A parallel Python package in the same folder is a second project sharing a directory, not an extension.

## Decision

Build M0 in TypeScript under `AgentGuard/benchmarks/m0/`, reusing `src/_core/stats.ts` and the repo's vitest/tsx toolchain. Isolate it from `benchmarks/run.js` so the existing garak-comparison benchmark stays untouched.

## Alternatives Considered

### Alternative 1: Parallel Python `aegis/` package
- **Pros**: Matches the plan's literal text; orjson/pydantic are familiar.
- **Cons**: Two languages/build systems in one repo; cannot import `_core`; results not directly comparable to the existing garak row.
- **Why not**: `orjson`/`pydantic` map 1:1 to JSON/zod here — nothing Python-only is needed. Sharing a folder is not the same as extending the project.

### Alternative 2: Extend `benchmarks/run.js` in place
- **Pros**: One harness, reuse done.
- **Cons**: That harness POSTs to a live server and string-matches "sorry/cannot"; unusable for a recorded tool-call oracle.
- **Why not**: Contaminates the garak-comparison benchmark and its text-refusal "detection rate" semantics.

## Consequences

### Positive
- M0 imports `_core` helpers directly and sits next to existing results.
- One toolchain, one CI, one test runner.

### Negative
- The plan document's Python command lines are now stale and must be read as TypeScript.

### Risks
- Someone re-adds a Python path out of plan-loyalty. Mitigated by this ADR and the OpenSpec proposal.
