# Changelog

## [Unreleased]

### Added

- Institutional learning docs (docs/solutions/) — 3 learnings captured from investigation sessions
- Mermaid flowchart architecture diagram in README
- Pitch Narrative with timing annotations and visual cues for live demo
- 4 annotated demo screenshots (dashboard, home cascade, voice test, graph explorer)
- README sections: Render Integration, Built With, What Judges Will See

### Fixed

- Dashboard KPI cards showing zeros (now display real values immediately)
- Cascade graph rendering (simplified DOM, removed nested grid)
- Demo sample size bumped to 15+ tests per category (removes Low Confidence warnings)
- Seed agent URLs now relative (works on Render deploy)
- Memory Poisoning now consistently listed in all category references
- CRT scanline overlay and SVG noise texture removed from index.css
- Newsreader font replaced with Inter throughout

## [0.1.0] - 2026-06-20

### Added

- Initial AgentGuard release
- CLI: `test`, `analyze`, `harden`, `pre-push`, `proxy`, `mcp` commands
- 10 attack categories (OWASP LLM + MITRE ATLAS mapping)
- Multi-model judge with Cohen's κ inter-rater reliability
- Wilson 95% confidence interval scoring
- Weighted multi-factor composite score with BIS letter grade
- Neo4j Aura Agent integration with Cypher Templates + Text2Cypher
- Force-directed cascade graph visualization
- Sarvam AI integration (sarvam-30b, Saaras STT, Bulbul TTS, Translate)
- Render Workflows nightly cron job
- GitHub Action CI integration
- Voice demo: mic → STT → LLM judge → TTS verdict loop
- Document upload pipeline (PDF → chunk → keyword-searchable graph)
- In-memory demo store with pre-seeded data
- Agent-as-code (agents/agentguard.json) with v2beta1 API
- Competitive research docs (docs/Tracks/, docs/internal/)
