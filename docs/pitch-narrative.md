# AgentGuard — Pitch Narrative

**Total time: 3:00 (180 seconds)**

---

## The Hook (0:00–0:15) — 15 seconds

"Most teams test their AI agents by hand, with English-only prompts, using a single judge. AgentGuard automates that — 10 attack categories, multi-model consensus, failure cascade graphs, and Indic language support."

**Visual:** Slide 1 — AgentGuard logo + tagline "CI for Your AI Agents"

**Judge takeaway:** This team built a CI pipeline for AI agent security — not a research tool, not a dashboard, a pipeline.

---

## The Problem (0:15–0:45) — 30 seconds

- Agent failures in production are expensive and visible
- Existing tools (PyRIT, garak) are research-focused, not CI-friendly
- No tool supports Indic-language attack generation
- No tool provides failure cascade analysis

**Visual:** Slide 2 — Problem statement with icons (broken shield, clock, globe, graph)

**Judge takeaway:** The market has red-teaming tools but no CI-native security harness. This is a gap.

---

## The Solution (0:45–1:45) — 60 seconds

- CLI + Dashboard + GitHub Action + Proxy mode
- 10 OWASP/ATLAS-aligned attack categories
- Multi-model judge with swap-position double-judging + Cohen's κ
- Neo4j cascade graph: Louvain communities + PageRank + lift ratios
- Sarvam-powered Hindi/Hinglish attack generation + voice testing
- CI/CD integration: pre-push hook + GitHub Action + Render cron

**Visual:** Slide 3 — Architecture diagram (Mermaid from README)

**Judge takeaway:** Three sponsor tracks with genuine API usage — Neo4j for graph analysis, Sarvam for Indic AI, Render for deployment.

---

## Demo Flow (1:45–3:00) — 75 seconds

1. **[0:00–0:15]** Launch demo → see 10 attack categories run in parallel
   - *Visual cue:* Dashboard shows attack cards lighting up in real time
2. **[0:15–0:30]** Watch cascade graph animate with failure propagation particles
   - *Visual cue:* Force-directed graph with Louvain-colored communities
3. **[0:30–0:45]** Voice test: speak a Hinglish jailbreak → hear Hindi verdict
   - *Visual cue:* Mic waveform → Sarvam STT → LLM judge → Bulbul TTS
4. **[0:45–0:55]** Upload a JSON test run → explore via NL query
   - *Visual cue:* Graph Explorer with natural language input
5. **[0:55–1:05]** Show proxy mode intercepting live traffic
   - *Visual cue:* Terminal showing real-time swap-position judging
6. **[1:05–1:15]** Show GitHub Action PR comment with score + hardening YAML
   - *Visual cue:* GitHub PR with readiness score badge

**Judge takeaway:** Every feature is live, not mocked. The demo runs against a real agent endpoint.

---

## Why AgentGuard Wins (3:00) — closing

- Uncontested category: no past HACKHAZARDS winner built security/devtools
- Multi-track: hits 3/5 sponsor tracks with genuine API usage
- Ship-ready: CLI + CI + GitHub Action + MCP server
- Unique angle: "CI for your AI agents" — judges will remember it

**Visual:** Slide 4 — "Ship-ready. Multi-track. Uncontested."

**Judge takeaway:** This isn't a prototype — it's a deployed product with 1541 passing tests.
