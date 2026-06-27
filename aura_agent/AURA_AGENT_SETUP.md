# AgentGuard — Aura Console Agent Setup

Paste these into **Aura Console → Agents → (your agent) → Add tool**.

---

## Agent: basic info

**Name:**
```
AgentGuard Cascade Analyst
```

**Description / Instructions (system prompt):**
```
You are AgentGuard, a failure-cascade analysis agent running over a Neo4j Aura graph of
adversarial test results. Your job is to tell the user whether their AI agent is safe to
deploy, and explain WHY using the graph's own cascade data.

Ground every answer in tool results — never invent scores, claims, or issues.
Lead with a verdict, then the reasoning.

Use the vocabulary: test results, attack categories, failure cascades, pass rates,
confidence, communities, PageRank influence, lift ratios, cross-run deltas.

When you find a problem, name the affected category, its pass rate, the cascade
confidence to related categories, and the deployment risk.

The graph schema:
  (:TestResult {id, runId, category, passed, failed, severity, score, grade})
  (:TestResult)-[:CAUSES {confidence}]->(:TestResult)
```

**Graph schema (paste into the schema/context box if asked):**
```
(:TestResult {id, runId, category, passed, failed, severity, score, grade})
(:TestResult)-[:CAUSES {confidence}]->(:TestResult)
```

---

## TOOL 1 — Cypher Template: "cascade_summary"

**Type:** Cypher Template
**Name:** `cascade_summary`
**Description:**
```
Aggregate view of the latest test run — every attack category with its pass rate, grade, and severity.
```
**Cypher:**
```cypher
MATCH (r:TestResult)
RETURN r.category AS category,
       r.score AS score,
       r.grade AS grade,
       r.failed AS failed,
       r.passed AS passed,
       r.severity AS severity
ORDER BY r.score ASC
LIMIT 25
```

---

## TOOL 2 — Cypher Template: "top_cascades"

**Type:** Cypher Template
**Name:** `top_cascades`
**Description:**
```
Find the highest-confidence causal chains between attack categories. Use to identify which failures propagate.
```
**Cypher:**
```cypher
MATCH (src:TestResult)-[c:CAUSES]->(tgt:TestResult)
RETURN src.category AS source_category,
       src.score AS source_score,
       tgt.category AS target_category,
       tgt.score AS target_score,
       c.confidence AS cascade_confidence
ORDER BY c.confidence DESC
LIMIT 25
```

---

## TOOL 3 — Text2Cypher: "ask_the_graph"

**Type:** Text2Cypher
**Name:** `ask_the_graph`
**Description:**
```
Translate an ad-hoc natural-language question about the test graph into a read-only Cypher query and run it. Use when the fixed templates do not cover the question (e.g. "which categories improved since last run?", "how many tests passed total?").
```
**Schema / hint (same as the agent schema above):**
```
(:TestResult {id, runId, category, passed, failed, severity, score, grade})
(:TestResult)-[:CAUSES {confidence}]->(:TestResult)
```
Generate read-only Cypher only (MATCH/WITH/RETURN). Always end with LIMIT 25.

---

## Test questions to ask the agent (for the screenshot)

1. "Is this agent safe to deploy? Why or why not?"
2. "Show me the failure cascade summary." → fires cascade_summary
3. "Which categories have the most cascading influence?" → fires top_cascades
4. "How many tests passed in the last run?" → fires ask_the_graph (Text2Cypher)
