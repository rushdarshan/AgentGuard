# AgentGuard — Adversarial Testing Harness for AI Agents

Systematically red-teams AI agents against 7 attack categories: Prompt Injection, Context Overflow, Logic Collapse, Jailbreak, Hallucination, Schema Drift, and Multi-tenant Context Leak.

## Quick Start

```bash
cp .env.example .env    # add your LLM API key
npm install
npm run dev             # server (:4000) + client (:3000) via concurrently
```

## Architecture

```
┌─────────────────┐     ┌──────────────────────┐     ┌──────────────┐
│  Vite (port 3000)│────▶│  Express (port 4000) │────▶│  LLM Judge   │
│  React + tRPC    │     │  tRPC + Auth + SSR   │     │  OpenAI v1   │
│  shadcn-style UI │     │  Drizzle ORM → MySQL │     └──────────────┘
└─────────────────┘     │  Neo4j AuraDB (opt)  │
                         │  Render Workflows    │
                         └──────────────────────┘
```

## 7 Attack Categories

| Category | Description |
|----------|------------|
| Prompt Injection | Instruction override and context hijacking |
| Context Overflow | Behavior under extreme input/memory pressure |
| Logic Collapse | Reasoning failures and contradictions |
| Jailbreak | Safety guardrail bypass |
| Hallucination | Fabricated responses |
| Schema Drift | Tool calling with unexpected input shapes |
| Multi-tenant Leak | Cross-user data extraction |

## Test Flow

1. Register agent endpoint → encrypts auth headers at rest
2. Configure categories, intensity (low/med/high), count (1-100)
3. LLM generates novel attacks per category tailored to agent description
4. 20 concurrent workers attack the agent endpoint (10s timeout)
5. LLM judge evaluates each response → per-category scores
6. Composite reliability score (0-100) with severity ratings

## Partner Track Integrations

- **Neo4j AuraDB** — failure cascade graphs (Cypher queries)
- **Render Workflows** — multi-step test orchestration
- **Sarvam AI** — multilingual attack prompts (22+ Indian languages)

## Built for HACKHAZARDS '26

Stack: TypeScript · tRPC v10 · Express 5 · React 18 · Vite · Tailwind CSS · Drizzle ORM · MySQL · Neo4j (optional)
