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
npm test       # if it exists — run it
```

No test suite yet? Manual testing:
- `npx agentguard test --url <endpoint>` against a real agent
- Verify the dashboard renders at localhost:3000
- Run `npm run demo` and click through the UI

If you add a non-trivial function, include a `demo()` self-check at the bottom of the file. One assert beats zero.

## Architecture

AgentGuard is two processes: a CLI and a web server, sharing a core library. The CLI (`src/cli/`) calls the core library directly — it's just tsx executing TypeScript functions. The web server (`server/index.ts`) serves a Vite+React SPA (`src/pages/`, `src/components/`) over Express + tRPC and optionally connects to MySQL (via Drizzle) and Neo4j AuraDB. Both MySQL and Neo4j gracefully fall back to in-memory stores — the app runs fully functional with no external services.

The core library (`src/_core/`) is the only part that matters. It contains the multi-provider judge with swap-position double-judging and Cohen's κ consensus, the LLM abstraction layer (OpenRouter, Groq, Gemini, Sarvam), PII detection, an HTTP forward proxy, Neo4j GDS wrappers with pure-JS fallback, the hardening config generator, report generation, and the adversarial "disprove" phase. Every module has a single responsibility and zero cross-dependencies beyond `src/_core/llm.ts`.

The frontend is a standard React SPA with tRPC clients calling the server's router. No state management library — React's built-in hooks and URL state are sufficient. CSS is inline Tailwind (no separate stylesheets). New pages go in `src/pages/`, new components in `src/components/`, new core logic in `src/_core/`. If you're adding a feature that touches more than two of these directories, reconsider the design.
