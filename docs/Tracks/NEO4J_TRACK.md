# Neo4j AuraDB Track

**Requirement:** Relationships must be central to how the product works, powered by AuraDB. The graph database must not be optional or secondary — it must be the reason the product works better. AuraDB must be the primary database for core data interactions, with real queries executed against it.

---

## How AgentGuard Meets This

Neo4j AuraDB is not a feature of AgentGuard — it is the reasoning layer that powers every insight the product produces. Failure cascade analysis, community detection, PageRank influence scoring, and cross-run graph deltas all depend on traversing relationships in the graph. None of these are achievable with flat tables; they require relationship-aware queries.

MySQL handles structured, transactional data — user accounts, agent metadata, test run records — because that data is naturally tabular and doesn't benefit from graph modeling. **Failure cascades, causal chains, community assignments, and PageRank scores live in Neo4j**, because that data is fundamentally relational, and the product's core value (understanding how failures propagate) comes directly from traversing those relationships.

Pure-JS fallback implementations exist for every GDS procedure (Louvain, PageRank, lift ratios) so the product works in development without Aura. In production, AuraDB is the primary engine.

---

## Why a Graph, Specifically

A flat table can tell you "Prompt Injection failed 3 times." It cannot tell you "Prompt Injection failures cascade into Jailbreak failures with 80% confidence, which then cascade into Multi-tenant Context Leak with 65% confidence — breaking the entire left side of your attack surface." That second sentence is only possible because the underlying data is modeled as connected nodes, not isolated rows.

---

## Data Model

**Nodes:**
- `TestResult` — id, runId, category, passed, failed, severity, score, grade, analyzedAt

**Relationships:**
```
(:TestResult)-[:CAUSES {confidence: 0–100}]->(:TestResult)
```

No secondary node types or intermediate tables. Every analysis — community detection, PageRank, lift ratios, path traversal — runs over this single node type and single relationship type.

---

## Real Queries Run Against AuraDB

**Cascade summary — latest run:**
```cypher
MATCH (r:TestResult)
RETURN r.category, r.score, r.grade, r.failed, r.passed, r.severity
ORDER BY r.score ASC LIMIT 25
```

**Top cascades — highest-confidence causal chains:**
```cypher
MATCH (src:TestResult)-[c:CAUSES]->(tgt:TestResult)
RETURN src.category, src.score, tgt.category, tgt.score, c.confidence
ORDER BY c.confidence DESC LIMIT 25
```

**Community detection (Louvain):**
```cypher
CALL gds.louvain.stream('agentguard_graph')
YIELD nodeId, communityId
WITH gds.util.asNode(nodeId) AS node, communityId
RETURN communityId, collect(node.category) AS categories,
       avg(node.score) AS avgScore
ORDER BY avgScore ASC LIMIT 10
```

**Influential failures (PageRank):**
```cypher
CALL gds.pageRank.stream('agentguard_graph')
YIELD nodeId, score
RETURN gds.util.asNode(nodeId).category AS category, score
ORDER BY score DESC LIMIT 10
```

**Cross-run delta:**
```cypher
MATCH (a:TestResult {runId: $runA}), (b:TestResult {runId: $runB})
WHERE a.category = b.category AND a.score <> b.score
RETURN a.category, a.score AS oldScore, b.score AS newScore,
       b.score - a.score AS delta ORDER BY delta ASC LIMIT 25
```

---

## Aura Agent

AgentGuard ships a ready-to-deploy Aura Agent definition in `aura_agent/`:

| File | Purpose |
|------|---------|
| `schema.cypher` | Graph schema with constraints and indexes |
| `system_prompt.md` | Agent instructions for the Aura Console |
| `templates/*.cypher` | 5 Cypher Template tools + 1 Text2Cypher tool |
| `AURA_AGENT_SETUP.md` | Step-by-step Aura Console setup guide |
| `PLATFORM_PACK.md` | Platform pack overview |

The agent answers: "Is this agent safe to deploy? Why or why not?" using the graph's own cascade data.

---

## Which Components Depend on AuraDB

- **Cascade Engine** — reads CAUSES relationships to compute community assignments, PageRank scores, and lift ratios
- **Report Generator** — queries AuraDB to include community-aware failure analysis in HTML reports
- **Cross-Run Comparator** — compares graph topology across test runs to detect new failure patterns

Without AuraDB, these components degrade to less informative JS fallback implementations. The graph is not optional here; it is what makes the analysis relational rather than tabular.
