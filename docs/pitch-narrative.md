# AgentGuard — Pitch Narrative

## The Hook (15 seconds)
"Most teams test their AI agents by hand, with English-only prompts, using a single judge. AgentGuard automates that — 10 attack categories, multi-model consensus, failure cascade graphs, and Indic language support."

## The Problem (30 seconds)
- Agent failures in production are expensive and visible
- Existing tools (PyRIT, garak) are research-focused, not CI-friendly
- No tool supports Indic-language attack generation
- No tool provides failure cascade analysis

## The Solution (60 seconds)
- CLI + Dashboard + GitHub Action + Proxy mode
- 10 OWASP/ATLAS-aligned attack categories
- Multi-model judge with confidence scoring
- Neo4j cascade graph with Louvain communities + PageRank
- Sarvam-powered Hindi/Hinglish attack generation + voice testing
- CI/CD integration: pre-push hook + GitHub Action + Render cron

## Demo Flow (90 seconds)
1. [DEMO] Launch demo → see 10 attack categories run in parallel
2. [DEMO] Watch cascade graph animate with failure propagation particles
3. [DEMO] Voice test: speak a Hinglish jailbreak → hear Hindi verdict
4. [DEMO] Upload a JSON test run → explore via NL query
5. [DEMO] Show proxy mode intercepting live traffic
6. [DEMO] Show GitHub Action PR comment with score + hardening YAML

## Tracks Claimed
- **Neo4j**: Cascade graph + Louvain communities + PageRank + Aura Agent (6 tools)
- **Sarvam AI**: sarvam-30b + Saaras STT + Bulbul TTS + Translate — 4/5 APIs
- **Render**: Cron workflow + Deploy Hook + render.yaml service definitions

## Why AgentGuard Wins
- Uncontested category: no past HACKHAZARDS winner built security/devtools
- Multi-track: hits 3/5 sponsor tracks with genuine usage
- Ship-ready: CLI + CI + GitHub Action + MCP server
- Unique angle: "CI for your AI agents" — judges will remember it
