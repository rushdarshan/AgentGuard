## Why

AgentGuard has no empirical evidence that its gateway stops tool-supply-chain attacks. It reports text-refusal detection against a garak prompt-injection corpus, but nothing measures whether a *forbidden downstream action* is prevented. Without a real, reproducible results table the flagship Poisoned-Tool Proving Ground claim is unsupported, and every later milestone (U1–U7) is gated on producing that table first.

## What Changes

This is the **U0 tracer slice only**. It ships one controlled, offline, keyless experiment that emits a regenerable results table. It does **not** build the dashboard, Neo4j exporter, broad MCP compatibility, or a real-LLM study.

- Add `benchmarks/m0/`, a TypeScript experiment isolated from `benchmarks/run.js`. The existing garak harness stays byte-identical.
- Author a new deterministic **Tier-1 static sink gate**: a ~15-line matcher over a single `sink-denylist.ts` that is the one source of truth for both the gate and the oracle.
- Add a **seeded stochastic simulated agent** (spy sink records a *would-execute* event; nothing real runs). `trust_probability` is a documented calibration constant, not an empirical LLM estimate.
- Add **five tool-supply-chain attack families** (poisoned tool description, hidden tool response, spoofed tool output, argument injection, destructive-command relay), one canonical fixture each, plus five clean counterparts for false-positive rate.
- Run **paired vulnerable (passthrough) vs protected (Tier-1)** across 20 seeds → 300 simulated in-process runs.
- Emit raw JSON traces plus a generated Markdown table to `results/m0/`; a CI test regenerates the table from committed traces and fails on drift.
- Reuse `src/_core/stats.ts` helpers (`wilsonCI`, `formatCI`) for descriptive per-cell CIs. Headline comparison is the paired **conditional Block Rate**; `isSignificant()` is not used. No latency claim in M0.

**Claim boundary:** M0 measures *pipeline validity and causal gate effect under a calibrated simulator*, not real-world LLM-agent security efficacy. That claim belongs to the later M1 real-LLM study.

## Capabilities

### New Capabilities
- `m0-attack-fixtures`: the five attack-family fixtures and five clean counterparts, and their poison delivery contract.
- `m0-simulated-agent`: seeded stochastic agent that trusts poisoned tool output and may emit a forbidden sink call; reproducible by seed.
- `m0-tier1-gate`: deterministic static denylist gate over `sink-denylist.ts`, single source of truth shared with the oracle.
- `m0-oracle`: success = `forbidden_sink_emitted` under the three locked conditions; conditional Block Rate definition.
- `m0-runner-report`: paired run matrix, raw trace schema, generated table, and CI table-drift check.

### Modified Capabilities
None. No existing spec-level requirements change (`benchmarks/run.js` and garak comparison are untouched; `stats.ts` is consumed, not modified).

## Impact

- New code: `benchmarks/m0/{attacks,tracer,runner,oracle}/`, `sink-denylist.ts`, `results/m0/`.
- New tests: five family oracle tests + clean-control FPR test + CI table-regeneration drift test (vitest).
- Reused unchanged: `src/_core/stats.ts`. Isolated from: `benchmarks/run.js`.
- Zero new runtime dependencies. No gateway/dashboard/Neo4j/UI changes.
- Follow-on (explicitly out of scope here): U1 real-LLM adapter, U2–U7 breadth, dashboard, Neo4j, expanded attack classes.
