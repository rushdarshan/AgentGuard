# Contributing

## PR Process

1. **Fork** the repo, create a branch off `main`
2. **Commit** with conventional commits (see below)
3. **Open a PR** against `main` with a one-paragraph summary of what and why
4. Maintainer reviews. If asked to change something, change it. No debates.

## Code Style

- TypeScript. No `any`. No `// @ts-ignore`.
- No comments. Code should be self-explanatory. If it isn't, simplify it.
- **Ponytail philosophy**: YAGNI always. stdlib before npm. One line before ten. Delete before adding. No speculative abstractions, no interfaces with one implementation, no config for a value that never changes.
- `npm run lint` must pass. `npm run typecheck` must pass.

## Commit Messages

[Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add per-language pass-rate chart
fix: cascade graph render loop
chore: bump deps
```

Subject ≤ 50 chars. Body only if the "why" isn't obvious.

## Running Locally

```bash
npm install
npm run dev    # server (:4000) + client (:3000)
npm run demo   # pre-seeded in-memory demo
```

Requires Node.js 20+. API keys in `.env` (see `.env.example`).

## Testing

```bash
npx vitest run src        # Unit tests
npx vitest run lab        # Lab tests
npx vitest run             # All tests
npm run lint              # Lint
npm run typecheck         # Typecheck
npx tsx lab/run.ts --mode=verify   # Lab evidence verification
npx tsx lab/run.ts --mode=replay   # Lab artifact replay
```

### Test-to-Module Map

| Module | Test pattern | What it covers |
|--------|-------------|----------------|
| `src/_core/proxy.ts` | `src/_core/harden.test.ts` | Egress proxy, hardening |
| `src/_core/judge.ts` | `src/_core/judge.test.ts` | Multi-model judge, fused verdict |
| `src/_core/llm/*.ts` | `src/_core/llm.test.ts` | LLM adapters, heuristic judge |
| `src/_core/stats.ts` | `src/_core/stats.test.ts` | Wilson CI, formatting |
| `src/_core/report.ts` | `src/_core/report.test.ts` | Report generation |
| `src/_core/pii.ts` | `src/_core/pii.test.ts` | PII detection |
| `src/routers.ts` | `src/routers.test.ts` | API router handlers |
| `lab/adapter.ts` | `lab/adapter.test.ts` | FusedVerdict → CaseExecution precedence |
| `lab/agreement.ts` | `lab/agreement.test.ts` | Dataset-level κ, exclusion tracking |
| `lab/bundle.ts` | `lab/bundle.test.ts` | Content-hash bundles, tamper detection |
| `lab/faults.ts` | `lab/faults.test.ts` | Five in-process fault demonstrations |
| `lab/verdict.ts` | `lab/verdict.test.ts` | Three-part CaseExecution model |
| `lab/replay.ts` | `lab/replay.test.ts` | Artifact replay, canonical projection |
| `benchmarks/m0/` | `benchmarks/m0/*.test.ts` | M0 runner, oracle, table generation |

### Diagnosing Failures

| Symptom | Likely cause | Check |
|---------|-------------|-------|
| `EVALUATOR_ERROR` in Lab report | Adapter couldn't map FusedVerdict to CaseExecution | Read the adapter precedence table in `lab/adapter.ts` |
| `INFRASTRUCTURE_ERROR` | Missing trace or evidence integrity failure | Check the bundle's `evidenceIntegrity.findings` array |
| `REPLAY_MISMATCH` | Canonical projection differs between runs | Compare the replayed bundle against the committed bytes |
| `ABSTAIN` | Judges disagree or insufficient survivors | Check `agreement.json` for per-pair κ and exclusion reasons |
| M0 shows `undefined` for blocked ASR | No blocked-attack traces exist | Check `results/m0/traces.jsonl` for `blocked` condition |
| `NaN` in Wilson CI | 0 paired cases | Check experiment coverage; κ is undefined with no paired data |

### Reproducibility

Lab results are generated from committed evidence bundles. To verify:
```bash
npx tsx lab/run.ts --mode=verify   # Check schema, hashes, provenance, drift
npx tsx lab/run.ts --mode=replay   # Re-score and reject mismatches
npx vitest run lab                  # Run all lab tests
```

The REPORT.md is regenerated from the evidence bundles and protected by a
regeneration drift test (`lab/report.drift.test.ts`). If you change the
report renderer, regenerate and re-commit the report before pushing.

M0 results are regenerated from `benchmarks/m0/runner.ts`:
```bash
npx tsx benchmarks/m0/runner.ts     # Regenerate traces + table
```

## Architecture

AgentGuard is two processes: a CLI and a web server, sharing a core library. The CLI (`src/cli/`) calls the core library directly — it's just tsx executing TypeScript functions. The web server (`server/index.ts`) serves a Vite+React SPA (`src/pages/`, `src/components/`) over Express + tRPC and optionally connects to MySQL (via Drizzle) and Neo4j AuraDB. Both MySQL and Neo4j gracefully fall back to in-memory stores — the app runs fully functional with no external services.

The core library (`src/_core/`) is the only part that matters. It contains the multi-provider judge with swap-position double-judging and Cohen's κ consensus, the LLM abstraction layer (OpenRouter, Groq, Gemini, Sarvam), PII detection, an HTTP forward proxy, Neo4j GDS wrappers with pure-JS fallback, the hardening config generator, report generation, and the adversarial "disprove" phase. Every module has a single responsibility and zero cross-dependencies beyond `src/_core/llm.ts`.

The frontend is a standard React SPA with tRPC clients calling the server's router. No state management library — React's built-in hooks and URL state are sufficient. CSS is inline Tailwind (no separate stylesheets). New pages go in `src/pages/`, new components in `src/components/`, new core logic in `src/_core/`. If you're adding a feature that touches more than two of these directories, reconsider the design.
