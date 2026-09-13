# M0 Execution Protocol

This document records the exact execution procedure so someone else can reproduce
the M0 benchmark results.

## Prerequisites

- Node.js ≥ 20
- npm

## Run

```bash
cd AgentGuard
npm ci
npx tsx benchmarks/m0/runner.ts
```

Output:
- `results/m0/traces.jsonl` — one JSON line per run
- `results/m0/table.md` — summary table with Wilson 95% CI

## What Happens

1. `runner.ts` imports the 10 fixtures from `benchmarks/m0/attacks/` (2 per family).
2. For each seed (0–19), for each of the 5 families, the runner:
   - Builds the attack scenario
   - Invokes the oracle (`benchmarks/m0/oracle.ts`) which evaluates the response
   - Records a `Trace` with the result, confidence, and timestamps
3. After all runs, `report.ts` renders `results/m0/table.md` with Wilson CI.

## What Is Measured

- **ASR** (Attack Success Rate): fraction of runs where the attack succeeded
- **Block Rate**: fraction of attacks blocked by the Tier-1 gate
- **Wilson 95% CI**: confidence interval using Wilson score

## What Is NOT Measured

- Latency (in-process denylist check is measurement noise, not a systems result)
- Real LLM behavior (the simulated agent's trust probability p is a calibration parameter)

## Seeds

Seeds are the source of variation. Same seed → same outcome. Different seeds
→ genuinely different compliance draws. Running a deterministic tracer 20
identical times would yield 20 copies of one outcome (degenerate CI).

## Synthetic vs Real

M0 is a **pipeline validation experiment**. It proves the proxy, oracle,
and report pipeline work end to end. Real-LLM evaluation comes in M1.

## ADR Reference

See `docs/adr/0001-0006` for the architectural decisions behind M0.
