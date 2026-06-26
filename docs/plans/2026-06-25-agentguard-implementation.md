# AgentGuard Implementation Plan

**Deadline:** 30 June 2026 (HACKHAZARDS '26)

## 1. Root Scaffolding (R15)

**Files to create:**
- `package.json` — deps: react, react-dom, vite, typescript, tailwindcss, drizzle-orm, mysql2, @trpc/server, @trpc/react-query, @trpc/client, @tanstack/react-query, zod, wouter, lucide-react, neo4j-driver, sonner
- `tsconfig.json` — strict, `@/` → `./src/`
- `vite.config.ts` — react plugin, path alias
- `postcss.config.js` — tailwind + autoprefixer
- `tailwind.config.ts` — dark theme, `@/components/ui/**` content
- `src/index.css` — tailwind directives + dark theme baseline
- `src/main.tsx` — React entry
- `src/_core/env.ts` — env var reader
- `src/_core/trpc.ts` — `router`, `publicProcedure`, `protectedProcedure`
- `src/_core/cookies.ts` — session cookie helpers
- `src/_core/db.ts` — Drizzle singleton wrapper
- `src/_core/llm.ts` — OpenAI-compatible LLM client
- `src/components/ui/` — button, card, input, textarea, label, slider, checkbox, select, tooltip, alert-dialog, sonner (shadcn-style)
- `src/lib/trpc.ts` — tRPC client hook setup
- `src/const.ts` — attack categories, severity thresholds
- `src/pages/*` — move root `.tsx` files into `src/pages/`

**Key decisions:** Minimum viable component library. Borrow from existing `outputs/AgentGuard_design_system.md` color tokens. No CSS-in-JS, no component library dependency.

## 2. Database + Auth (R1, R2)

**Files to create/modify:**
- `src/schema.ts` — Drizzle schema (7 MySQL tables: users, agents, testSuites, testRuns, testResults, failureCascades, attackCorpus)
- `src/db.ts` — query functions (16 + getDb singleton)
- `drizzle.config.ts` — migration config
- `src/_core/hooks/useAuth.ts` — auth hook (session-based)
- Auth middleware: session cookie → user context → protectedProcedure

**Migration:** Generate initial migration. Drop old `0001_chemical_winter_soldier.sql` and re-migrate.

**Note:** `failureCascades` MySQL table is created in schema but only as a write-through cache. Neo4j is the source of truth for cascade queries (unit 8).

## 3. Agent CRUD (R1, R2)

**Files to create/modify:**
- `src/pages/AgentsList.tsx` — list + delete
- `src/pages/AgentForm.tsx` — create/edit form
- `src/routers.ts` — agentRouter (list, get, create, update, delete)
- `src/_core/encryption.ts` — envelope encryption for auth headers

## 4. Attack Corpus (R4, R5)

**Files to create/modify:**
- `src/pages/TestBuilder.tsx` — category selection UI
- `src/routers.ts` (attackCorpusRouter) — list by category, seed built-in prompts
- Seed script: 3+ built-in prompts × 7 categories = 21+ prompts
- 2 missing categories: Schema Drift, Multi-tenant Context Leak

## 5. Test Configuration (R3)

- `src/pages/TestBuilder.tsx` — intensity (low/med/high), count (1-100), category checkboxes
- `src/routers.ts` — createTestSuite mutation
- Zod validation for config shapes

## 6. Test Execution Engine (R6, R7, R8, R16, R19)

**Files to create/modify:**
- `src/routers.ts` — createTestRun mutation → submits Render Workflow
- `src/_core/workflow.ts` — Render Workflow definition (generate → execute → evaluate → score)
- `src/_core/testAgent.ts` — `testAgentEndpoint()` with 10s timeout, JSONPath extractor
- `src/_core/llm.ts` — `evaluateResponse()` LLM judge (replace heuristic)
- Concurrent worker pool (configurable concurrency, 5-20 concurrent)

**Render Workflow steps:**
1. Generate attacks (built-in + LLM-generated, per category)
2. Send attacks concurrently to agent endpoint
3. LLM judge evaluates each response
4. Compute per-category scores + overall reliability
5. Save results to MySQL + sync cascades to Neo4j
6. Complete workflow (dashboard polls on reload)

## 7. Dashboard + Scorecard (R9, R10, R11)

**Files to create/modify:**
- `src/pages/Dashboard.tsx` — aggregate stats, recent runs, critical issues
- `src/pages/TestRunHistory.tsx` — filterable/sortable run list
- `src/pages/TestRunDetail.tsx` — scorecard, per-category breakdown, gate
- `src/components/ui/` — ReliabilityGate, FindingBanner components

**States per screen:** loading, empty, error, success, partial results (R18)

## 8. Failure Details + Neo4j Cascades (R12, R20)

**Files to create/modify:**
- `src/_core/neo4j.ts` — Neo4j driver singleton, Cypher query functions
- `src/routers.ts` — cascade query endpoint (Cypher: `MATCH (r:TestResult)-[:CAUSES*]->(affected)`)
- `src/pages/TestRunDetail.tsx` — cascade graph visualization (SVG/force-directed)
- Sync: after each test run, write cascade edges to Neo4j

**Cypher schema:**
```cypher
CREATE CONSTRAINT FOR (r:TestResult) REQUIRE r.id IS UNIQUE
CREATE INDEX FOR (r:TestResult) ON (r.testRunId)
```

**Nodes:** `TestResult` (id, category, passed, severity, prompt, response, verdict)
**Relationships:** `(:TestResult)-[:CAUSES {confidence}]->(:TestResult)`

## 9. Sarvam Multilingual (R21)

**Files to create/modify:**
- `src/_core/sarvam.ts` — Sarvam API client (translation endpoint)
- `src/pages/TestBuilder.tsx` — language selector toggle
- `src/routers.ts` — expand test generation to produce multilingual variants
- `src/_core/workflow.ts` — parallel multilingual attack step

**Flow:** When multilingual enabled, each generated attack prompt is translated into selected languages via Sarvam API → sent in parallel to agent → judged by LLM. A pass requires all language variants to pass.

## 10. Cleanup (R13, R14)

- Delete `frontend/` and `backend/` directories
- Delete `outputs/` (old design docs superseded by this doc)
- Update `render.yaml` for new architecture
- Remove `schema.cypher` (Neo4j schema lives in migration code now)

## 11. Polish + Demo

- Demo script: "Demo Money Shot" — show agent working → run AgentGuard → reveal failure → apply fix → re-run showing PASS
- README update with architecture, setup steps, screenshots
- `.env.example` with all required API keys
- Video screen recording (60s max) for submission
- Test: manual E2E flow against a demo agent endpoint

---

## Dependency Order

```
1 → 2 → 3+4 → 5+6 → 7+8 → 9 → 10 → 11
```

Units 3-4 are parallel (agent CRUD doesn't depend on attack corpus). Units 7-8 are parallel (dashboard doesn't depend on Neo4j cascades). Unit 9 depends on 6 (needs execution engine). Unit 10 is last (old dirs removed after migration complete).

---

## Risks

| Risk | Mitigation |
|------|-----------|
| Render Workflows not available / too complex | Fallback: Promise.all with in-process concurrency |
| Neo4j AuraDB setup takes too long | Fallback: SQL cascade table + recursive CTE query |
| Sarvam API latency slows test runs | Make multilingual optional, run in parallel |
| LLM judge cost at scale | Cache judge verdicts per prompt, batch when possible |
| 2-min target with 7×5×3 = 105 requests | Concurrent worker pool (20 parallel) keeps wall time low |
