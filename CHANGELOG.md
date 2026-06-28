# Changelog

## [Unreleased]

### Added

- Per-language pass-rate chart on run detail page (Sarvam track win)
- Schedule/cron toggle on agent cards (Render Workflows track win)
- OG meta tags, favicon, GitHub/Devpost footer links
- Per-language analysis with Sarvam language identification
- Wiki grounding + reasoning effort for sarvam-30b judge evaluations
- Streaming chat option for Sarvam API

### Fixed

- Dashboard KPI cards showing zeros (now display real values immediately)
- Cascade graph rendering (simplified DOM, removed nested grid)
- Demo sample size bumped to 15+ tests per category (removes Low Confidence warnings)
- Seed agent URLs now relative (works on Render deploy)
- Memory Poisoning now consistently listed in all category references

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
