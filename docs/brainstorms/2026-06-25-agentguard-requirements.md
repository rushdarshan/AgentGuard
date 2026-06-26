---
date: 2026-06-25
topic: agentguard-ci-for-ai-agents
---

# AgentGuard: CI for AI Agents

## Problem Frame

Engineers shipping LLM agents to production can't reliably test them before deploy. Agents demo perfectly then fail silently — prompt injection, context overflow, logic collapse, jailbreaks, hallucinations, schema drift, multi-tenant leaks. The March 2026 HN practitioner thread "Ask HN: How do you test your LLM agents in production?" names all 7 modes and says "almost no one systematically tests #4–#6 before shipping." Tooling lags the agent-build wave.

AgentGuard solves this: point it at any agent endpoint, run an adversarial test suite across all 7 attack categories, get a reliability scorecard with a pass/fail CI gate. Catches failures before users (or attackers) do.

---

## Actors

- A1. **Engineer**: Registers agent endpoints, configures test suites, views reliability scorecards, drills into failures. Primary user.
- A2. **LLM Judge**: Evaluates agent responses to determine pass/fail per attack. Requires API key.
- A3. **Agent Under Test**: The target LLM agent endpoint receiving adversarial prompts over HTTP.
- A4. **Sarvam Translator**: Translates attack prompts into 22+ Indian languages to test multilingual adversarial robustness.

---

## Key Flows

- F1. **Register Agent**
  - **Trigger:** Engineer navigates to /agents/new
  - **Actors:** A1
  - **Steps:** Enter name, endpoint URL, optional description, optional auth headers → save
  - **Outcome:** Agent appears in the agents list, ready for testing
  - **Covered by:** R1, R2

- F2. **Configure and Run Test Suite**
  - **Trigger:** Engineer selects an agent and opens the test builder
  - **Actors:** A1, A2, A3
  - **Steps:** Select attack categories (≥1) → configure intensity + count per category → press "Run Test Suite" → LLM generates additional attack prompts → each attack is sent to agent endpoint → LLM judge evaluates each response
  - **Outcome:** Test run is created with status=running, final score computed (v1 polls on page reload for updates)
  - **Covered by:** R3, R4, R5, R6

- F3. **View Reliability Scorecard**
  - **Trigger:** Test run completes or engineer navigates to a completed run
  - **Actors:** A1
  - **Steps:** See composite score (0–100) → see per-category breakdown with pass/fail counts → see severity badges → gate shows PASS (100% secure) or FAIL (any vulnerability)
  - **Outcome:** Engineer knows immediately whether the agent is safe to ship
  - **Covered by:** R7, R8, R10

- F4. **Drill Into Failure Details**
  - **Trigger:** Engineer clicks a category or test run
  - **Actors:** A1
  - **Steps:** View individual attack prompts → see agent responses → see LLM judge verdict with reasoning
  - **Outcome:** Engineer understands exactly how the agent failed and can reproduce it
  - **Covered by:** R12

---

## Requirements

**[Attack Suite]**
- R1. Engineer can register agent endpoints (name, URL, description, optional auth headers) and manage them (edit, delete). Auth headers are encrypted at rest.
- R2. Agents are isolated per user — each engineer sees only their own agents and test runs. Authentication (session or API key) is required before any flow.
- R3. Engineer can configure a test run by selecting from 7 attack categories and setting intensity (low/medium/high) and test count (1–100) per category. Intensity is defined per category (number and sophistication of prompts).
- R4. The 7 attack categories are: Prompt Injection, Context Overflow, Logic Collapse, Jailbreak, Hallucination, Schema Drift, Multi-tenant Context Leak.
- R5. Each category has a built-in corpus of ≥3 attack prompts. The LLM may generate additional prompts tailored to the agent's description.

**[Test Execution]**
- R6. Tests run against real agent HTTP endpoints (POST with JSON body `{ prompt }`). No built-in simulation.
- R7. LLM-as-judge evaluates each agent response for failure indicators. Heuristic fallback is not used — an API key is required.
- R8. Each attack produces a pass/fail verdict. A category passes if all its tests pass. A run passes (gate=PASS) only if all selected categories are fully secure.
- R19. Test execution is orchestrated via **Render Workflows** — multi-step jobs with retries, state management, and observability. The fire-and-force pattern is replaced by a workflow that: generate attacks → send to agent → evaluate → score → notify.

**[Dashboard]**
- R9. Dashboard shows: total agents, average reliability score, recent test runs, critical issues count.
- R10. Per-run scorecard shows composite score (0–100), per-category breakdown (pass rate, severity badge), and pass/fail gate.
- R11. Test run history with filters (status, score range) and sort (by date, score).
- R12. Failure details: for any attack, show the prompt sent, agent response received, and LLM judge verdict. Failure-cascade relationships (which attacks trigger cascading failures) are stored in **Neo4j AuraDB** and rendered as a graph visualization — Cypher query powers the "drill into failure propagation" view.

**[System Architecture]**
- R13. Drop old `frontend/` and `backend/` directories. The production code lives at the repo root using tRPC + Drizzle ORM + MySQL.
- R14. Old design docs in `outputs/` (GraphQL/Neo4j era) are replaced by this document.
- R15. Root-level build scaffolding must be created first: package.json, tsconfig.json with @/ path alias, Vite config, _core/ module stubs, UI component library.
- R16. Test execution uses **Render Workflows** for orchestration — a multi-step job that generates attacks, sends them to the agent, evaluates responses, computes scores, and saves results. Workers run concurrently (configurable concurrency limit) to meet the 2-minute target.
- R17. Define the agent response schema extraction path per endpoint (configurable JSONPath or dot-notation). Default adapters for common frameworks (LangChain, OpenAI SDK).
- R18. UI interaction states must be specified per screen: loading, empty, error, success, partial results.
- R20. Failure-cascade relationships are stored in **Neo4j AuraDB** instead of a relational table. The cascade visualization uses Cypher queries to render failure propagation paths. Existing MySQL `failureCascades` table is removed.
- R21. Attack prompts can be translated into 22+ Indian languages via **Sarvam AI API**. When multilingual mode is enabled, the same attack is sent in parallel in multiple languages to test cross-lingual adversarial robustness.

---

## Success Criteria

- Engineer can register a real agent endpoint, run a test suite across all 7 categories (5 tests per category, low intensity), and see a reliability scorecard in under 2 minutes. Total time depends on agent endpoint latency; Render Workflows orchestrate the concurrent execution.
- Gate correctly shows FAIL when any category has <100% security, even if the composite score is high.
- The LLM judge produces a verdict (pass/fail + reasoning) for every attack response.
- Failure-cascade graph renders in Neo4j AuraDB — engineers can visually trace failure propagation via Cypher queries.
- Attack prompts are available in 22+ Indian languages via Sarvam AI API. Multilingual mode is a run configuration option.
- Old `frontend/` and `backend/` code is removed — no stale architecture confusion in the repo.

---

## Scope Boundaries

- **CLI tooling** — deferred. Web dashboard is the v1 interface.
- **Neo4j AuraDB** — in scope for failure-cascade graph storage and visualization. The `failureCascades` MySQL table is removed; Cypher queries replace relational traversal. Neo4j partner track integration.
- **Render Workflows** — in scope for test execution orchestration. Replaces fire-and-forget with multi-step workflows. Render partner track integration.
- **Sarvam AI** — in scope for multilingual attack prompt generation. Translates prompts into 22+ Indian languages. Sarvam partner track integration.
- **GraphQL** — out of scope. Removed entirely alongside the old Apollo architecture.
- **CI/CD integration** (GitHub Actions plugin, webhook gate) — deferred. The v1 scorecard is human-visible in the dashboard only. The product name reflects the long-term vision, not the v1 scope.
- **Real-time streaming** (SSE/WebSocket for live test progress) — deferred. V1 polls on page reload.
- **Export / PDF reports** — deferred.
- **Python CLI** — deferred. TypeScript-only in v1.

---

## Key Decisions

- **Architecture**: tRPC/Drizzle/MySQL at repo root, plus **Neo4j AuraDB** for cascade graphs and **Render Workflows** for execution orchestration. Old Apollo/GraphQL/Neo4j in `frontend/` + `backend/` is removed.
- **No CLI in v1**: Web dashboard is the primary (and only) interface.
- **Real endpoints only**: No simulation — tests call real agent HTTP endpoints.
- **LLM evaluation required**: No heuristic fallback. Judge is always an LLM with an API key. Default provider: OpenAI-compatible API. API key injected via environment variable, not stored in the database.
- **7 attack categories**: Full set from the HN practitioner thread, not a subset.
- **Neo4j for cascades**: Failure-propagation graphs use Neo4j AuraDB. Cypher queries traverse the cascade tree instead of recursive SQL.
- **Render Workflows for execution**: Test runs are multi-step Render Workflows (generate → execute → evaluate → score). Provides retries, state management, observability.
- **Sarvam for multilingual**: Attack prompts can be translated into 22+ Indian languages. Enabled per run as a config option. Sarvam API key via env var.

---

## Dependencies / Assumptions

- MySQL database is available (Drizzle ORM manages schema via migrations).
- Neo4j AuraDB instance is available (connection URI + credentials via env vars). Used exclusively for failure-cascade graph storage and queries.
- Render platform is available (Render API key + workflow definition). Test execution is submitted as a Render Workflow.
- Sarvam AI API key is available via environment variable (optional — multilingual mode is a toggle).
- LLM API key (OpenAI-compatible) is injected via environment variable for the judge. Not stored in the database, logged, or exposed to the client.
- Agent under test exposes an HTTP POST endpoint accepting `{ prompt }` and returning a response body. The response extraction path is configurable per agent endpoint.
- Agent endpoint URLs must not target private/internal network addresses (SSRF protection). HTTPS is required.

---

## Outstanding Questions

### Resolve Before Planning

- (none)

### Resolved During Review

- [Resolved] LLM provider: default to OpenAI-compatible API. Cost/latency/accuracy to be measured during implementation.
- [Resolved] LLM API key storage: environment variable injection. Not stored in DB.
- [Resolved] CI naming: product name reflects long-term vision; v1 scope is clearly labeled as dashboard-only.
- [Resolved] Auth headers encryption: encrypt at rest using envelope encryption. Key managed via env var.
- [Resolved] Auth mechanism: required pre-flow. Session or API key auth for user identity.
- [Resolved] Intensity levels: defined per attack category as number and sophistication of prompts.
- [Resolved] Interaction states: loading/empty/error/success/partial required per screen.

### Deferred to Planning

- [Needs research] What is the exact response schema expected from agent endpoints? The `testAgentEndpoint` function reads `data.response || data.text || JSON.stringify(data)` — verify this works for common agent frameworks. Configurable JSONPath extractor to be implemented.
- [Technical] The `@/` import aliases (`@/components/ui/`, `@/lib/trpc`, `@/_core/`) need Vite/tsconfig path resolution set up before the UI pages work.
- [Technical] SSRF protection implementation: URL allowlist (deny private/loopback/multicast/cloud-metadata ranges).
- [Technical] Neo4j schema and sync: define Cypher schema for failure-cascade nodes/relationships, sync cascade data from test results to Neo4j.
- [Technical] Render Workflow definition: author the workflow YAML/JSON for test execution (generate → execute → evaluate → score → notify).
- [Technical] Sarvam integration: translate attack prompts via Sarvam API, parallel execution of multilingual variants.
- [Technical] LLM-as-judge integration: replace heuristic evaluateResponse() with structured verdict calls.
- [Technical] Add 2 missing attack category corpora (Schema Drift, Multi-tenant Context Leak) to built-in corpus.
- [Technical] Auto-refresh polling: wire refetch or remove dead interval stub code.

---

## Next Steps

-> Implement the plan: root scaffolding → auth → UI components → agent CRUD → attack engine → LLM judge → Neo4j cascades → Render Workflows → Sarvam multilingual → polish & demo
