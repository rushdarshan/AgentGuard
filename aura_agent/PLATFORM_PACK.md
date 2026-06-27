# AgentGuard — Neo4j Aura Platform Pack

## What this pack includes

| File | Purpose |
|------|---------|
| `schema.cypher` | Graph schema — run this first to create constraints + indexes |
| `system_prompt.md` | Agent system prompt — paste into Aura Agent Instructions |
| `templates/01_cascade_summary.cypher` | Cypher Template: aggregate test run summary |
| `templates/02_top_cascades.cypher` | Cypher Template: highest-confidence causal chains |
| `templates/03_high_risk_communities.cypher` | Cypher Template: Louvain community detection |
| `templates/04_influential_failures.cypher` | Cypher Template: PageRank influence scores |
| `templates/05_cross_run_delta.cypher` | Cypher Template: compare two test runs |
| `templates/06_text2cypher.cypher` | Text2Cypher: ad-hoc natural-language queries |
| `AURA_AGENT_SETUP.md` | Step-by-step setup guide for Aura Console |

## Agent-as-Code (Neo4j v2beta1 API)

The agent definition is also version-controlled in `agents/agentguard.json` and can be
reconciled with Aura via one script:

```bash
python scripts/create_aura_agent.py          # status: list agents
python scripts/create_aura_agent.py --pull   # pull live definition → agents/agentguard.json
python scripts/create_aura_agent.py --push   # push agents/agentguard.json → Aura
```

Set `AURA_CLIENT_ID`, `AURA_CLIENT_SECRET`, and optionally `AURA_AGENT_ID`.

## Quickstart

1. Open [Neo4j Aura Console](https://console.neo4j.io) → your instance → Query.
2. Copy-paste `schema.cypher` and run it.
3. Go to **Agents** → **Create Agent**.
4. Paste `system_prompt.md` into the Instructions field.
5. Schema/Context: paste the `(:TestResult {...})` definition from `system_prompt.md`.
6. **Add tools** → follow `AURA_AGENT_SETUP.md` for each Cypher Template and Text2Cypher tool.
7. Test with the 4 demo questions in `AURA_AGENT_SETUP.md`.

## Seeding demo data

Run `agentguard test --url <your-agent-url>` first to populate the graph,
or use the One-Click Demo mode (see `demo/` in the root of the repo).
